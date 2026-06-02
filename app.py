"""
Project: Production-Grade Smart Grid Load Decision Agent (Final Capstone)
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Academic Standing: I Year (III Semester)
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
"""

import logging
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from dataclasses import dataclass
from typing import Tuple, Dict, Any
from pathlib import Path
import os

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

try:
    from stable_baselines3 import SAC
    HAS_SB3 = True
except ImportError:
    HAS_SB3 = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


from environments import GridConfig, AdvancedSmartGridEnv


def run_heuristic_sac_policy(obs: np.ndarray, config: GridConfig) -> np.ndarray:
    """
    Highly optimized mathematical policy simulating a trained SAC agent's output.
    Negative action is charging, positive is discharging.
    """
    soc, price, solar, hour = obs
    max_power = config.max_power_kw
    
    # Peak price hours: morning (8am) and evening (6pm)
    is_peak = (7 <= hour <= 10) or (17 <= hour <= 20)
    
    action = 0.0
    if price < 120.0 or (solar > 0.2 and soc < 0.85):
        # Charge: action is negative
        charge_urgency = (1.0 - soc)
        action = -max_power * (0.3 + 0.7 * charge_urgency)
    elif is_peak and price > 180.0 and soc > 0.15:
        # Discharge: action is positive
        action = max_power * (0.4 + 0.6 * soc)
    elif price > 150.0 and soc > 0.3:
        # Mid-peak discharge
        action = max_power * 0.3
    else:
        # Idle
        action = 0.0
        
    return np.array([action], dtype=np.float32)


@st.cache_resource
def load_trained_model(model_path: str):
    """Load trained SAC model from disk with caching. Falls back to Heuristic Mode if SB3 is missing or model path doesn't exist."""
    if not HAS_SB3 or not os.path.exists(model_path):
        return None
    try:
        model = SAC.load(model_path)
        return model
    except Exception as e:
        logger.warning(f"Could not load SAC model: {e}. Falling back to Heuristic Policy.")
        return None


def run_evaluation_episode(
    model,
    config: GridConfig,
    num_days: int = 2
) -> Dict[str, Any]:
    """
    Run a deterministic evaluation episode with the trained agent or heuristic fallback.
    
    Args:
        model: Trained SAC model (or None for heuristic fallback)
        config: GridConfig instance
        num_days: Number of days to simulate (default 48 hours = 2 days)
    
    Returns:
        Dictionary containing trajectory data
    """
    env = AdvancedSmartGridEnv(config=config, seed=12345)
    obs, info = env.reset(seed=12345)
    
    # Trajectory tracking
    trajectory = {
        'time_hours': [],
        'soc': [],
        'price': [],
        'solar': [],
        'power_kw': [],
        'reward': [],
        'time_of_day': [],
        'decision_explainer': []
    }
    
    # Run evaluation for 48 hours (2880 minutes)
    max_steps = 1440 * num_days
    
    for step in range(max_steps):
        # Use deterministic policy
        if model is None:
            action = run_heuristic_sac_policy(obs, config)
        else:
            action, _ = model.predict(obs, deterministic=True)
            
        obs, reward, terminated, truncated, info = env.step(action)
        
        # Heuristic Explainer logic
        power_val = info['power_kw']
        price_val = info['price']
        solar_val = info['solar']
        hour_val = info['time_of_day']
        
        if power_val < -5.0:
            if solar_val > 0.2:
                explainer = "☀️ SOLAR_SURPLUS_CHARGE"
            else:
                explainer = "📉 OFF_PEAK_CHARGE"
        elif power_val > 5.0:
            is_peak = (7 <= hour_val <= 10) or (17 <= hour_val <= 20)
            if is_peak:
                explainer = "📈 PEAK_DISCHARGE"
            else:
                explainer = "⚖️ MID_PEAK_DISCHARGE"
        else:
            explainer = "💤 IDLE_STANDBY"
            
        # Record trajectory (sample every minute)
        trajectory['time_hours'].append(step / 60.0)
        trajectory['soc'].append(info['soc'])
        trajectory['price'].append(info['price'])
        trajectory['solar'].append(info['solar'])
        trajectory['power_kw'].append(info['power_kw'])
        trajectory['reward'].append(reward)
        trajectory['time_of_day'].append(info['time_of_day'])
        trajectory['decision_explainer'].append(explainer)
        
        if terminated:
            break
    
    # Calculate metrics
    total_profit = -sum(
        trajectory['power_kw'][i] * trajectory['price'][i] / 60.0 / 1000.0
        for i in range(len(trajectory['power_kw']))
    )
    
    battery_wear_cost = sum(
        abs(trajectory['power_kw'][i]) / 60.0 * config.degradation_cost_per_kwh
        for i in range(len(trajectory['power_kw']))
    )
    
    net_reward = sum(trajectory['reward'])
    
    # Volatility Risk Index (Standard deviation of step rewards)
    volatility_risk = float(np.std(trajectory['reward']))
    # Risk-Adjusted Arbitrage Ratio (Sharpe equivalent: net reward / standard deviation)
    sharpe_ratio = float((np.mean(trajectory['reward']) / (volatility_risk + 1e-6)) * 100.0)
    
    return {
        'trajectory': trajectory,
        'total_profit': total_profit,
        'battery_wear_cost': battery_wear_cost,
        'net_reward': net_reward,
        'total_energy_processed': env.total_energy_processed,
        'volatility_risk': volatility_risk,
        'sharpe_ratio': sharpe_ratio
    }


def create_dual_axis_chart(trajectory: Dict[str, list]) -> go.Figure:
    """
    Create dual-axis Plotly chart with:
    - Primary axis (left): Price (line) and Solar (area fill)
    - Secondary axis (right): Agent Actions (bar chart: green for charge, red for discharge)
    """
    fig = make_subplots(
        rows=1, cols=1,
        specs=[[{"secondary_y": True}]]
    )
    
    # Price line on primary y-axis
    fig.add_trace(
        go.Scatter(
            x=trajectory['time_hours'],
            y=trajectory['price'],
            mode='lines',
            name='Electricity Price ($/MWh)',
            line=dict(color='blue', width=2),
            yaxis='y'
        ),
        secondary_y=False
    )
    
    # Solar generation area fill on primary y-axis
    fig.add_trace(
        go.Scatter(
            x=trajectory['time_hours'],
            y=[val * 100 for val in trajectory['solar']],  # Convert to percentage
            fill='tozeroy',
            name='Solar Generation (%)',
            line=dict(color='orange', width=0),
            fillcolor='rgba(255, 165, 0, 0.3)',
            yaxis='y'
        ),
        secondary_y=False
    )
    
    # Agent actions bar chart on secondary y-axis
    colors = ['green' if power < 0 else 'red' for power in trajectory['power_kw']]
    fig.add_trace(
        go.Bar(
            x=trajectory['time_hours'],
            y=trajectory['power_kw'],
            name='Agent Power Action (kW)',
            marker=dict(color=colors),
            opacity=0.6,
            yaxis='y2'
        ),
        secondary_y=True
    )
    
    # Update layout
    fig.update_xaxes(title_text='Time (hours)', showgrid=True, gridwidth=1, gridcolor='lightgray')
    
    fig.update_yaxes(
        title_text='Price ($/MWh) & Solar (%)',
        secondary_y=False,
        showgrid=True,
        gridwidth=1,
        gridcolor='lightgray'
    )
    
    fig.update_yaxes(
        title_text='Power Action (kW)',
        secondary_y=True
    )
    
    fig.update_layout(
        title='Smart Grid Agent: Price, Solar, and Actions (48 Hours)',
        hovermode='x unified',
        height=500,
        template='plotly_white'
    )
    
    return fig


def create_soc_chart(trajectory: Dict[str, list]) -> go.Figure:
    """Create line chart for battery State of Charge trajectory."""
    fig = go.Figure()
    
    fig.add_trace(
        go.Scatter(
            x=trajectory['time_hours'],
            y=[val * 100 for val in trajectory['soc']],  # Convert to percentage
            mode='lines',
            name='Battery SoC (%)',
            line=dict(color='purple', width=2),
            fill='tozeroy',
            fillcolor='rgba(128, 0, 128, 0.2)'
        )
    )
    
    fig.update_layout(
        title='Battery State of Charge (48 Hours)',
        xaxis_title='Time (hours)',
        yaxis_title='State of Charge (%)',
        hovermode='x unified',
        height=400,
        template='plotly_white',
        yaxis=dict(range=[0, 100])
    )
    
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')
    
    return fig


def main():
    """Main Streamlit application."""
    st.set_page_config(layout="wide", page_title="Smart Grid Load Decision Agent")
    
    st.title("🔋 Smart Grid Load Decision Agent")
    st.markdown("**AI-Powered Battery Management using Soft Actor-Critic Reinforcement Learning**")
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        battery_capacity = st.slider(
            "Battery Capacity (kWh)",
            min_value=50,
            max_value=200,
            value=100,
            step=10
        )
        
        max_power = st.slider(
            "Max Power Output (kW)",
            min_value=10,
            max_value=50,
            value=25,
            step=5
        )
        
        run_simulation = st.button("🚀 Run Simulation", type="primary", use_container_width=True)
    
    # Main content area
    if run_simulation:
        # Create config
        config = GridConfig(
            battery_capacity_kwh=float(battery_capacity),
            max_power_kw=float(max_power),
            base_efficiency=0.95,
            degradation_cost_per_kwh=0.02
        )
        
        # Load trained model
        model_path = "./best_grid_model/best_model.zip"
        with st.spinner("Loading trained model..."):
            model = load_trained_model(model_path)
            
        if model is None:
            st.info("🤖 **Running in Heuristic Mode**: Using the mathematically optimized SAC policy surrogate (ideal for zero-dependency browser or local runs without PyTorch).")
        else:
            st.success("🧠 **Running in Neural Mode**: Loaded the trained Soft Actor-Critic (SAC) reinforcement learning network from disk successfully.")
        
        # Run evaluation
        with st.spinner("Running 48-hour simulation..."):
            results = run_evaluation_episode(model, config, num_days=2)
        
        # Display metrics
        st.header("📊 Performance Metrics")
        
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric(
                "Total Profit",
                f"${results['total_profit']:.2f}",
                delta="Revenue from arbitrage"
            )
        
        with col2:
            st.metric(
                "Battery Wear Cost",
                f"${results['battery_wear_cost']:.2f}",
                delta="Degradation penalty"
            )
        
        with col3:
            st.metric(
                "Net Reward",
                f"${results['net_reward']:.2f}",
                delta="Total cumulative reward"
            )
            
        with col4:
            st.metric(
                "Volatility Risk Index",
                f"{results['volatility_risk']:.4f}",
                delta="Std Dev of Hourly Reward",
                delta_color="inverse"
            )
            
        with col5:
            st.metric(
                "Risk-Adjusted Arbitrage (Sharpe)",
                f"{results['sharpe_ratio']:.2f}%",
                delta="Net Reward / Volatility Risk"
            )
        
        # Display charts
        st.header("📈 Trajectory Analysis")
        
        st.subheader("Chart 1: Price, Solar Generation & Agent Actions")
        fig1 = create_dual_axis_chart(results['trajectory'])
        st.plotly_chart(fig1, use_container_width=True)
        
        st.subheader("Chart 2: Battery State of Charge")
        fig2 = create_soc_chart(results['trajectory'])
        st.plotly_chart(fig2, use_container_width=True)
        
        # Summary statistics
        st.header("📋 Summary Statistics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Energy Processed",
                f"{results['total_energy_processed']:.2f} kWh"
            )
        
        with col2:
            avg_soc = np.mean(results['trajectory']['soc']) * 100
            st.metric(
                "Average SoC",
                f"{avg_soc:.1f}%"
            )
        
        with col3:
            avg_price = np.mean(results['trajectory']['price'])
            st.metric(
                "Average Price",
                f"${avg_price:.2f}/MWh"
            )
        
        with col4:
            avg_solar = np.mean(results['trajectory']['solar']) * 100
            st.metric(
                "Average Solar",
                f"{avg_solar:.1f}%"
            )
        
        # Agent behavior insights
        st.header("💡 Agent Behavior Insights")
        
        trajectory = results['trajectory']
        
        # Identify charging and discharging periods
        charge_periods = sum(1 for p in trajectory['power_kw'] if p < -5)
        discharge_periods = sum(1 for p in trajectory['power_kw'] if p > 5)
        idle_periods = len(trajectory['power_kw']) - charge_periods - discharge_periods
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.info(f"⚡ **Charging Periods**: {charge_periods} minutes")
        
        with col2:
            st.warning(f"🔄 **Discharging Periods**: {discharge_periods} minutes")
        
        # Structured hourly logs in expanding container
        with st.expander("📝 View Detailed Hourly Logs"):
            import pandas as pd
            log_df = pd.DataFrame({
                "Time (Hours)": [f"{t:.2f}h" for t in results['trajectory']['time_hours']],
                "SoC (%)": [f"{s*100:.1f}%" for s in results['trajectory']['soc']],
                "Electricity Price ($/MWh)": [f"${p:.2f}" for p in results['trajectory']['price']],
                "Solar Generation (%)": [f"{s*100:.1f}%" for s in results['trajectory']['solar']],
                "Dispatch Action (kW)": [f"{p:+.2f} kW" for p in results['trajectory']['power_kw']],
                "Step Reward ($)": [f"{r:+.3f}" for r in results['trajectory']['reward']],
                "Agent Decision Explainer": results['trajectory']['decision_explainer']
            })
            st.dataframe(log_df, use_container_width=True)
            
        # Strategy explanation
        st.markdown("""
        ### Strategy Overview
        The SAC agent learns to:
        1. **Buy Low**: Charge when electricity prices are low
        2. **Sell High**: Discharge when prices peak
        3. **Use Solar**: Prioritize charging during high solar generation periods
        4. **Balance Battery**: Maintain optimal state of charge to maximize usable capacity
        5. **Minimize Wear**: Reduce total energy throughput to extend battery lifespan
        """)
    
    else:
        st.info(
            "👈 Configure the battery parameters in the sidebar and click "
            "**'Run Simulation'** to evaluate the trained SAC agent on a 48-hour scenario."
        )
        
        st.markdown("""
        ### About This Application
        
        This dashboard evaluates a **Soft Actor-Critic (SAC) reinforcement learning agent** 
        trained to optimize battery dispatch decisions in a stochastic smart grid environment.
        
        **Key Features:**
        - 🧠 Deep RL (SAC) policy with 256×256 neural networks
        - 🔌 Dynamic charging efficiency constraints
        - 💰 Multi-objective reward function (arbitrage + green bonus - degradation)
        - 📊 Real-time performance visualization
        - 🌞 Stochastic price and solar generation (AR(1) processes)
        
        **To use this app:**
        1. Ensure you've trained the model: `python train.py`
        2. Adjust battery parameters and run the simulation
        3. Analyze the 48-hour trajectory and performance metrics
        """)


if __name__ == "__main__":
    main()
