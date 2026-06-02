import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots


st.set_page_config(page_title="Stochastic Smart Grid Load Decision Agent", layout="wide")


def generate_microgrid_data(hours: int, solar_intensity: float, seed: int) -> pd.DataFrame:
    """Create a synthetic microgrid trajectory for browser-only simulation."""
    rng = np.random.default_rng(seed)
    t = np.arange(hours)
    hour_of_day = t % 24

    morning_peak = np.exp(-((hour_of_day - 8.0) ** 2) / 10.0)
    evening_peak = np.exp(-((hour_of_day - 19.0) ** 2) / 8.0)
    price = 72 + 34 * morning_peak + 62 * evening_peak + rng.normal(0, 4.5, hours)
    price = np.clip(price, 25, 220)

    daylight_curve = np.sin(np.pi * (hour_of_day - 6) / 12)
    solar_shape = np.maximum(0.0, daylight_curve) ** 1.3
    solar_kw = 0.85 * solar_intensity * 45 * solar_shape
    solar_kw += rng.normal(0, 1.0, hours)
    solar_kw = np.clip(solar_kw, 0.0, None)

    base_load = 34 + 6 * np.sin(2 * np.pi * (hour_of_day - 13) / 24) ** 2
    demand_kw = base_load + rng.normal(0, 1.8, hours)
    demand_kw = np.clip(demand_kw, 20, None)

    return pd.DataFrame(
        {
            "step": t,
            "hour_of_day": hour_of_day,
            "price_mwh": price,
            "solar_kw": solar_kw,
            "demand_kw": demand_kw,
        }
    )


def simulate_heuristic_policy(
    data: pd.DataFrame,
    battery_capacity_kwh: float,
    max_power_kw: float,
    price_sensitivity: float,
) -> pd.DataFrame:
    """SAC-style continuous surrogate policy (heuristic, not a trained model)."""
    dt_h = 1.0
    eta_charge = 0.95
    eta_discharge = 0.95
    wear_cost_per_kwh = 0.018

    soc = 0.5
    soc_hist, action_hist, net_grid_hist = [], [], []
    energy_cashflow, wear_costs = [], []

    rolling_ref = data["price_mwh"].rolling(window=6, min_periods=1).mean()

    for i, row in data.iterrows():
        price = row["price_mwh"]
        solar = row["solar_kw"]
        demand = row["demand_kw"]

        price_dev = (price - rolling_ref.iloc[i]) / max(rolling_ref.iloc[i], 1e-6)
        soc_bias = soc - 0.55
        solar_drive = solar / max(data["solar_kw"].max(), 1e-6)

        # Smooth, continuous decision surface similar in spirit to SAC actions.
        decision_signal = (
            2.3 * price_sensitivity * price_dev
            - 1.25 * solar_drive
            - 1.1 * soc_bias
        )
        action_ratio = np.tanh(decision_signal)
        requested_power = float(action_ratio * max_power_kw)

        if requested_power >= 0:
            # Discharge battery to grid/load
            max_discharge = soc * battery_capacity_kwh / dt_h
            power = min(requested_power, max_discharge, max_power_kw)
            soc -= (power * dt_h) / (battery_capacity_kwh * eta_discharge)
            cashflow = power * dt_h * price / 1000.0
            throughput = power * dt_h
        else:
            # Charge battery from surplus/market
            req_charge = -requested_power
            max_charge = (1.0 - soc) * battery_capacity_kwh / (dt_h * eta_charge)
            power = -min(req_charge, max_charge, max_power_kw)
            soc += (-power * dt_h * eta_charge) / battery_capacity_kwh
            cashflow = power * dt_h * price / 1000.0  # negative while charging
            throughput = -power * dt_h

        soc = float(np.clip(soc, 0.0, 1.0))

        net_grid = demand - solar - max(power, 0.0) + max(-power, 0.0)

        soc_hist.append(soc)
        action_hist.append(power)
        net_grid_hist.append(net_grid)
        energy_cashflow.append(cashflow)
        wear_costs.append(throughput * wear_cost_per_kwh)

    out = data.copy()
    out["soc"] = soc_hist
    out["battery_power_kw"] = action_hist  # + discharge, - charge
    out["net_grid_kw"] = net_grid_hist
    out["profit_step"] = energy_cashflow
    out["wear_cost_step"] = wear_costs
    return out


def create_dashboard_charts(df: pd.DataFrame) -> tuple[go.Figure, go.Figure, go.Figure]:
    fig_market = make_subplots(specs=[[{"secondary_y": True}]])
    fig_market.add_trace(
        go.Scatter(x=df["step"], y=df["price_mwh"], name="Electricity Price ($/MWh)", line=dict(color="#1f77b4", width=2)),
        secondary_y=False,
    )
    fig_market.add_trace(
        go.Scatter(
            x=df["step"],
            y=df["solar_kw"],
            name="Solar Generation (kW)",
            fill="tozeroy",
            line=dict(color="#f39c12", width=1.5),
            fillcolor="rgba(243,156,18,0.25)",
        ),
        secondary_y=True,
    )
    fig_market.update_layout(template="plotly_white", hovermode="x unified", height=420, margin=dict(t=40, l=20, r=20, b=20))
    fig_market.update_xaxes(title_text="Hour")
    fig_market.update_yaxes(title_text="Price ($/MWh)", secondary_y=False)
    fig_market.update_yaxes(title_text="Solar (kW)", secondary_y=True)

    fig_soc = go.Figure()
    fig_soc.add_trace(
        go.Scatter(
            x=df["step"],
            y=100 * df["soc"],
            mode="lines",
            name="Battery SoC (%)",
            line=dict(color="#8e44ad", width=2),
            fill="tozeroy",
            fillcolor="rgba(142,68,173,0.15)",
        )
    )
    fig_soc.update_layout(
        template="plotly_white",
        hovermode="x unified",
        height=320,
        margin=dict(t=40, l=20, r=20, b=20),
        yaxis=dict(range=[0, 100]),
        xaxis_title="Hour",
        yaxis_title="State of Charge (%)",
    )

    colors = np.where(df["battery_power_kw"] >= 0, "#e74c3c", "#27ae60")
    fig_action = make_subplots(specs=[[{"secondary_y": True}]])
    fig_action.add_trace(
        go.Bar(
            x=df["step"],
            y=df["battery_power_kw"],
            name="Charge/Discharge Action (kW)",
            marker_color=colors,
            opacity=0.8,
        ),
        secondary_y=False,
    )
    fig_action.add_trace(
        go.Scatter(
            x=df["step"],
            y=df["net_grid_kw"],
            mode="lines",
            name="Net Grid Load Decision (kW)",
            line=dict(color="#2c3e50", width=2),
        ),
        secondary_y=True,
    )
    fig_action.update_layout(template="plotly_white", hovermode="x unified", height=360, margin=dict(t=40, l=20, r=20, b=20))
    fig_action.update_xaxes(title_text="Hour")
    fig_action.update_yaxes(title_text="Battery Power (kW)", secondary_y=False)
    fig_action.update_yaxes(title_text="Net Grid Load (kW)", secondary_y=True)

    return fig_market, fig_soc, fig_action


st.title("Stochastic Smart Grid Load Decision Agent Dashboard")
st.caption(
    "Academic demonstration of a stochastic microgrid dispatch policy using a lightweight "
    "SAC-style continuous heuristic surface. This is a simulated surrogate, not a trained RL model."
)

with st.sidebar:
    st.header("Scenario Controls")
    horizon_hours = st.selectbox("Simulation Horizon", options=[24, 48], index=1)
    battery_capacity_kwh = st.slider("Battery Capacity (kWh)", 40, 400, 180, 10)
    max_power_kw = st.slider("Maximum Battery Power (kW)", 5, 120, 45, 1)
    price_sensitivity = st.slider("Price Sensitivity", 0.2, 2.5, 1.2, 0.1)
    solar_intensity = st.slider("Solar Intensity", 0.1, 1.5, 1.0, 0.05)
    random_seed = st.number_input("Random Seed", min_value=1, max_value=99999, value=42)

base = generate_microgrid_data(int(horizon_hours), float(solar_intensity), int(random_seed))
results = simulate_heuristic_policy(
    base,
    battery_capacity_kwh=float(battery_capacity_kwh),
    max_power_kw=float(max_power_kw),
    price_sensitivity=float(price_sensitivity),
)

sim_profit = float(results["profit_step"].sum())
battery_wear_cost = float(results["wear_cost_step"].sum())
net_reward = sim_profit - battery_wear_cost
average_soc = float((100 * results["soc"]).mean())

m1, m2, m3, m4 = st.columns(4)
m1.metric("Simulated Profit", f"${sim_profit:,.2f}")
m2.metric("Battery Wear Cost", f"${battery_wear_cost:,.2f}")
m3.metric("Net Reward", f"${net_reward:,.2f}")
m4.metric("Average SoC", f"{average_soc:.1f}%")

fig_market, fig_soc, fig_action = create_dashboard_charts(results)

st.subheader("Market Signals: Electricity Price and Solar Generation")
st.plotly_chart(fig_market, use_container_width=True)

st.subheader("Battery State of Charge")
st.plotly_chart(fig_soc, use_container_width=True)

st.subheader("Control Actions and Net Grid Load Decision")
st.plotly_chart(fig_action, use_container_width=True)

st.dataframe(
    results[["step", "price_mwh", "solar_kw", "battery_power_kw", "soc", "net_grid_kw"]].round(3),
    use_container_width=True,
    hide_index=True,
)
