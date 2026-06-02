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


@dataclass
class GridConfig:
    """Configuration dataclass for Smart Grid environment parameters."""
    battery_capacity_kwh: float = 100.0
    max_power_kw: float = 25.0
    base_efficiency: float = 0.95
    degradation_cost_per_kwh: float = 0.02
    training_timesteps: int = 50000


class AdvancedSmartGridEnv(gym.Env):
    """
    Advanced Smart Grid Load Decision Environment using Soft Actor-Critic.
    
    Observation Space:
        - State of Charge (SoC): [0, 1]
        - Electricity Price: continuous
        - Solar Generation: [0, 1] (normalized)
        - Time of Day: [0, 23]
    
    Action Space:
        - Continuous power dispatch: [-max_power_kw, max_power_kw]
          Negative: charging, Positive: discharging
    """
    
    metadata = {"render_modes": []}
    
    def __init__(self, config: GridConfig = None, seed: int = None):
        """Initialize the Smart Grid environment."""
        super().__init__()
        
        self.config = config or GridConfig()
        self.rng = np.random.RandomState(seed)
        
        # Observation space: [SoC, Price, Solar, Time]
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0, 0.0]),
            high=np.array([1.0, 500.0, 1.0, 24.0]),
            dtype=np.float32
        )
        
        # Action space: continuous power dispatch [-max_power, max_power]
        self.action_space = spaces.Box(
            low=-self.config.max_power_kw,
            high=self.config.max_power_kw,
            shape=(1,),
            dtype=np.float32
        )
        
        # State variables
        self.soc: float = 0.5  # State of charge (0-1)
        self.current_step: int = 0
        self.max_steps: int = 1440  # 24 hours * 60 minutes
        
        # AR(1) process parameters for stochasticity
        self.price_mean: float = 150.0
        self.price_phi: float = 0.8  # AR(1) autocorrelation
        self.solar_phi: float = 0.7
        self.current_price: float = self.price_mean
        self.current_solar_base: float = 0.0
        
        # Noise standard deviations
        self.price_noise_std: float = 25.0
        self.solar_noise_std: float = 0.15
        
        # Energy tracking for metrics
        self.total_energy_processed: float = 0.0
        self.cumulative_reward: float = 0.0
        
        logger.info("AdvancedSmartGridEnv initialized with config: %s", self.config)
    
    def _generate_solar_profile(self, time_of_day: float) -> float:
        """
        Generate solar generation profile using sinusoidal curve.
        Peak at midday (12:00), zero at night.
        """
        # Sinusoidal profile: peak at hour 12
        solar_clean = max(0.0, np.sin((time_of_day - 6) * np.pi / 12))
        return solar_clean
    
    def _generate_price_profile(self, time_of_day: float) -> float:
        """
        Generate electricity price profile with daily pattern.
        Higher during peak hours (morning and evening).
        """
        # Dual-peak profile: morning (8am) and evening (6pm)
        morning_peak = np.exp(-((time_of_day - 8) ** 2) / 8)
        evening_peak = np.exp(-((time_of_day - 18) ** 2) / 8)
        price_clean = self.price_mean * (1.0 + 0.5 * (morning_peak + evening_peak))
        return price_clean
    
    def _update_stochastic_processes(self) -> Tuple[float, float]:
        """
        Update AR(1) stochastic processes for price and solar.
        
        Process: x_{t+1} = mean + phi * (x_t - mean) + epsilon_t
        """
        # Update price using AR(1)
        price_clean = self._generate_price_profile(self.current_step / 60.0)
        price_shock = self.rng.normal(0, self.price_noise_std)
        self.current_price = (
            self.price_mean + 
            self.price_phi * (self.current_price - self.price_mean) + 
            price_shock
        )
        self.current_price = np.clip(self.current_price, 50.0, 400.0)
        
        # Update solar using AR(1)
        time_of_day = (self.current_step / 60.0) % 24.0
        solar_clean = self._generate_solar_profile(time_of_day)
        solar_shock = self.rng.normal(0, self.solar_noise_std)
        self.current_solar_base = (
            solar_clean + 
            self.solar_phi * (self.current_solar_base - solar_clean) + 
            solar_shock
        )
        self.current_solar_base = np.clip(self.current_solar_base, 0.0, 1.0)
        
        return self.current_price, self.current_solar_base
    
    def _calculate_charging_efficiency(self, soc: float) -> float:
        """
        Calculate dynamic non-linear charging efficiency.
        Efficiency decreases as SoC approaches 100%.
        """
        # Efficiency penalty increases quadratically near full charge
        penalty = (soc ** 2) * (1.0 - self.config.base_efficiency)
        efficiency = self.config.base_efficiency - penalty
        return np.clip(efficiency, 0.7, 0.95)
    
    def _execute_power_action(self, power_kw: float) -> float:
        """
        Execute power dispatch action with physics constraints.
        
        Args:
            power_kw: Requested power (negative: charge, positive: discharge)
        
        Returns:
            actual_power_kw: Power actually processed
        """
        dt_hours = 1.0 / 60.0  # 1 minute timestep
        
        if power_kw < 0:  # Charging
            efficiency = self._calculate_charging_efficiency(self.soc)
            # Account for efficiency loss
            power_demand = -power_kw / efficiency
            # Limit by available capacity
            max_charge_rate = (1.0 - self.soc) * self.config.battery_capacity_kwh / dt_hours
            actual_power = -min(power_demand, max_charge_rate) * efficiency
        else:  # Discharging
            # Limit by available energy
            max_discharge_rate = self.soc * self.config.battery_capacity_kwh / dt_hours
            actual_power = min(power_kw, max_discharge_rate)
        
        # Update state of charge
        energy_change_kwh = actual_power * dt_hours / self.config.battery_capacity_kwh
        self.soc = np.clip(self.soc - energy_change_kwh, 0.0, 1.0)
        
        return actual_power
    
    def _calculate_reward(self, power_kw: float, price: float, solar: float) -> float:
        """
        Calculate composite reward function.
        
        Components:
        1. Financial Arbitrage: Profit from price difference (buy low, sell high)
        2. Green Bonus: Reward for charging during high solar generation
        3. Degradation Penalty: Cost proportional to battery throughput
        """
        dt_hours = 1.0 / 60.0
        
        # 1. Financial Arbitrage Reward
        # Negative power (charging) at low price is good
        # Positive power (discharging) at high price is good
        arbitrage_reward = -power_kw * price * dt_hours / 1000.0
        
        # 2. Green Bonus: Reward charging during high solar
        green_bonus = 0.0
        if power_kw < 0:  # Charging
            green_bonus = -power_kw * solar * 0.5  # Up to 0.5 $/kWh bonus
        
        # 3. Degradation Penalty
        # Battery degradation is proportional to energy throughput
        energy_processed = abs(power_kw) * dt_hours
        degradation_penalty = (
            energy_processed * self.config.degradation_cost_per_kwh
        )
        
        # 4. Efficiency Bonus (encourage staying at mid-SoC)
        soc_penalty = -10.0 * ((self.soc - 0.5) ** 2)
        
        total_reward = arbitrage_reward + green_bonus - degradation_penalty + soc_penalty
        
        self.total_energy_processed += energy_processed
        self.cumulative_reward += total_reward
        
        return float(total_reward)
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Execute one step in the environment.
        
        Returns:
            observation: Current state
            reward: Reward for this step
            terminated: Episode finished (end of 24 hours)
            truncated: Episode truncated (not used here)
            info: Additional information
        """
        # Extract power action
        power_kw = float(action[0])
        
        # Update stochastic processes
        price, solar = self._update_stochastic_processes()
        
        # Execute power action with physics
        actual_power = self._execute_power_action(power_kw)
        
        # Calculate reward
        reward = self._calculate_reward(actual_power, price, solar)
        
        # Increment timestep
        self.current_step += 1
        
        # Check termination (24 hours = 1440 minutes)
        terminated = self.current_step >= self.max_steps
        
        # Build observation
        time_of_day = (self.current_step / 60.0) % 24.0
        observation = np.array([
            self.soc,
            price,
            solar,
            time_of_day
        ], dtype=np.float32)
        
        info = {
            'soc': self.soc,
            'price': price,
            'solar': solar,
            'power_kw': actual_power,
            'time_of_day': time_of_day,
            'total_energy': self.total_energy_processed,
            'cumulative_reward': self.cumulative_reward
        }
        
        return observation, float(reward), terminated, False, info
    
    def reset(self, seed: int = None, options: Dict[str, Any] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Reset the environment to initial state.
        
        Returns:
            observation: Initial state
            info: Initial information dictionary
        """
        if seed is not None:
            self.rng = np.random.RandomState(seed)
        
        self.soc = 0.5
        self.current_step = 0
        self.current_price = self.price_mean
        self.current_solar_base = 0.0
        self.total_energy_processed = 0.0
        self.cumulative_reward = 0.0
        
        observation = np.array([
            self.soc,
            self.current_price,
            0.0,
            0.0
        ], dtype=np.float32)
        
        info = {
            'soc': self.soc,
            'price': self.current_price,
            'solar': 0.0,
            'time_of_day': 0.0
        }
        
        logger.debug("Environment reset to initial state")
        
        return observation, info


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
