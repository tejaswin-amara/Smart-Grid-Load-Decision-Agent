"""
Project: Stochastic Smart Grid Load Decision Agent
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
Academic Standing: I Year (III Semester)
"""

import numpy as np
from typing import Dict, List, Tuple, Any


class SimulationEngine:
    """
    Stochastic microgrid simulation engine implementing AR(1) price/solar
    processes, Markov weather chain, and non-linear battery physics.
    
    Produces 48 hourly steps of pricing, solar generation, and weather,
    then allows step-by-step or batch execution of dispatch decisions.
    """

    # Markov weather chain parameters
    WEATHER_NAMES: List[str] = ["SUNNY", "CLOUDY", "STORMY"]
    WEATHER_ICONS: List[str] = ["☀️", "⛅", "⛈️"]
    WEATHER_MULTIPLIERS: List[float] = [1.0, 0.4, 0.08]
    TRANSITION_MATRIX: List[List[float]] = [
        [0.75, 0.20, 0.05],
        [0.25, 0.60, 0.15],
        [0.10, 0.35, 0.55]
    ]

    # Physics constants
    BASE_EFFICIENCY: float = 0.95
    DEGRADATION_COST_PER_KWH: float = 0.02
    TIME_STEP_DURATION: float = 1.0  # 1 hour per game step
    T_AMB: float = 25.0
    T_NOMINAL: float = 25.0
    R_THERMAL: float = 0.001
    TAU: float = 0.1
    LAMBDA_WEAR: float = 0.005

    def __init__(
        self,
        capacity: float = 100.0,
        max_power: float = 25.0,
        volatility: float = 0.03,
        seed: int = 42,
        base_efficiency: float = 0.95,
        degradation_cost_per_kwh: float = 0.02
    ) -> None:
        """Initialize the simulation engine with battery parameters."""
        self.capacity = capacity
        self.max_power = max_power
        self.volatility = volatility
        self.rng = np.random.RandomState(seed)
        self.base_efficiency = base_efficiency
        self.degradation_cost_per_kwh = degradation_cost_per_kwh

        # State variables
        self.soc_kwh: float = capacity / 2.0
        self.cell_temp: float = self.T_AMB
        self.total_profit: float = 0.0
        self.total_wear: float = 0.0
        self.cumulative_reward: float = 0.0
        self.step_index: int = 0

        # Pre-generated stochastic sequences (populated by generate_sequences)
        self.price_seq: List[float] = []
        self.solar_seq: List[float] = []
        self.weather_seq: List[Dict[str, str]] = []

        # Step history for trajectory tracking
        self.history: Dict[str, List] = {
            'hours': [],
            'prices': [],
            'solar': [],
            'actions': [],
            'soc': [],
            'rewards': [],
            'profits': [],
            'wears': [],
            'explainers': []
        }

    @property
    def soc_percent(self) -> float:
        """Current State of Charge as a percentage."""
        return (self.soc_kwh / self.capacity) * 100.0

    def _rk4_update_temp(self, power_kw: float, dt: float) -> float:
        """Runge-Kutta 4th Order (RK4) integration for cell temperature stability."""
        h = dt / 10.0
        power_squared = power_kw ** 2
        # continuous time tau constant mapping e^(-alpha * dt) = 1 - self.TAU
        # since self.TAU = 0.1, e^(-alpha * 1.0) = 0.9 => alpha = -np.log(0.9)
        alpha = -np.log(1.0 - self.TAU) / dt
        
        def f(T):
            return -alpha * (T - self.T_AMB) + self.R_THERMAL * power_squared
            
        T = self.cell_temp
        for _ in range(10):
            k1 = f(T)
            k2 = f(T + 0.5 * h * k1)
            k3 = f(T + 0.5 * h * k2)
            k4 = f(T + h * k3)
            T += (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        return float(T)

    def reset(self) -> None:
        """Reset all state to initial conditions."""
        self.soc_kwh = self.capacity / 2.0
        self.cell_temp = self.T_AMB
        self.total_profit = 0.0
        self.total_wear = 0.0
        self.cumulative_reward = 0.0
        self.step_index = 0
        self.history = {
            'hours': [], 'prices': [], 'solar': [], 'actions': [],
            'soc': [], 'rewards': [], 'profits': [], 'wears': [],
            'explainers': []
        }

    def generate_sequences(self) -> Tuple[List[float], List[float], List[Dict[str, str]]]:
        """
        Generate 48 stochastic steps for pricing, solar and weather
        using AR(1) processes and Markov chain transitions.

        Returns:
            Tuple of (price_seq, solar_seq, weather_seq)
        """
        # Base deterministic profiles
        base_price_profile: List[float] = []
        base_solar_profile: List[float] = []
        for h in range(24):
            price = 0.15 + 0.1 * (
                np.sin(np.pi * (h - 6) / 12) * (1.0 if h < 12 else 0.0) +
                np.sin(np.pi * (h - 18) / 6) * (1.0 if h >= 12 else 0.0)
            )
            base_price_profile.append(price)
            solar = max(0.0, 50.0 * np.sin(np.pi * (h - 6) / 12))
            base_solar_profile.append(solar)

        weather_state = 0
        p_noise = 0.0
        s_noise = 0.0

        self.price_seq = []
        self.solar_seq = []
        self.weather_seq = []

        for step in range(48):
            current_hour = step % 24

            # Markov weather transition
            rand = self.rng.uniform()
            cumulative_prob = 0.0
            next_state = weather_state
            for s in range(3):
                cumulative_prob += self.TRANSITION_MATRIX[weather_state][s]
                if rand <= cumulative_prob:
                    next_state = s
                    break
            weather_state = next_state
            multiplier = self.WEATHER_MULTIPLIERS[weather_state]

            # AR(1) noise generation (Box-Muller via numpy)
            phi_price = 0.8
            phi_solar = 0.7
            z0 = self.rng.normal(0, 1)
            z1 = self.rng.normal(0, 1)

            p_noise = phi_price * p_noise + z0 * self.volatility
            s_noise = phi_solar * s_noise + z1 * 2.0
            p_noise = np.clip(p_noise, -0.1, 0.1)
            s_noise = np.clip(s_noise, -10.0, 10.0)

            price = max(0.05, base_price_profile[current_hour] + p_noise)
            solar = max(0.0, (base_solar_profile[current_hour] + s_noise) * multiplier)

            self.price_seq.append(price)
            self.solar_seq.append(solar)
            self.weather_seq.append({
                'icon': self.WEATHER_ICONS[weather_state],
                'name': self.WEATHER_NAMES[weather_state]
            })

        return self.price_seq, self.solar_seq, self.weather_seq

    def step(self, action_val: float) -> Dict[str, Any]:
        """
        Execute one simulation step with the given action.

        Args:
            action_val: Normalized action in [-1, 1].
                        Positive = charge, Negative = discharge.

        Returns:
            Dict with step results: profit, wear, reward, soc_percent,
            net_power_kw, explainer, weather_label
        """
        if self.step_index >= 48:
            raise RuntimeError("Simulation complete: all 48 steps consumed.")

        current_hour = self.step_index % 24
        current_price = self.price_seq[self.step_index]
        current_solar = self.solar_seq[self.step_index]
        weather = self.weather_seq[self.step_index]
        soc_norm = self.soc_kwh / self.capacity

        # Action → raw power
        raw_power_kw = action_val * self.max_power

        # Sigmoid smoothing near SoC bounds
        smoothed_power_kw = raw_power_kw
        if raw_power_kw > 0:
            charge_bounds_factor = 1.0 - (1.0 / (1.0 + np.exp(-20.0 * (soc_norm - 0.9))))
            smoothed_power_kw = raw_power_kw * charge_bounds_factor
        elif raw_power_kw < 0:
            discharge_bounds_factor = 1.0 / (1.0 + np.exp(-20.0 * (soc_norm - 0.1)))
            smoothed_power_kw = raw_power_kw * discharge_bounds_factor

        # Clamp to feasible bounds
        max_charge = max(0.0, smoothed_power_kw)
        max_discharge = min(0.0, smoothed_power_kw)

        available_charge = max(0.0, self.capacity - self.soc_kwh)
        available_discharge = self.soc_kwh

        actual_charge_kw = min(max_charge, available_charge / self.TIME_STEP_DURATION)
        actual_discharge_kw = max(max_discharge, -available_discharge / self.TIME_STEP_DURATION)
        net_power_kw = actual_charge_kw + actual_discharge_kw

        # Non-linear efficiency
        soc_efficiency = 1.0 - 0.2 * (soc_norm ** 2)
        rate_factor = 1.0 - 0.1 * (abs(net_power_kw) / self.max_power)
        efficiency = max(0.7, self.base_efficiency * soc_efficiency * rate_factor)

        # SoC state transition
        if net_power_kw >= 0:
            self.soc_kwh = min(self.capacity, self.soc_kwh + net_power_kw * self.TIME_STEP_DURATION * efficiency)
        else:
            self.soc_kwh = max(0.0, self.soc_kwh - abs(net_power_kw) * self.TIME_STEP_DURATION / efficiency)

        # Multi-objective reward components
        step_profit = current_price * (-net_power_kw) * self.TIME_STEP_DURATION
        green_bonus = 0.1 * actual_charge_kw * current_solar / 100.0 * self.TIME_STEP_DURATION

        # Dynamic thermal wear calculus via RK4 solver
        self.cell_temp = self._rk4_update_temp(net_power_kw, self.TIME_STEP_DURATION)
        temp_diff = self.cell_temp - self.T_NOMINAL
        dynamic_degradation_rate = self.degradation_cost_per_kwh * (
            1.0 + self.LAMBDA_WEAR * (temp_diff ** 2)
        )
        degradation_penalty = dynamic_degradation_rate * abs(net_power_kw) * self.TIME_STEP_DURATION

        step_reward = step_profit + green_bonus - degradation_penalty

        # Accumulate totals
        self.total_profit += step_profit
        self.total_wear += degradation_penalty
        self.cumulative_reward += step_reward

        # Decision explainer
        is_peak = (9 <= current_hour <= 12) or (18 <= current_hour <= 21)
        if net_power_kw > 5.0:
            explainer = "☀️ SOLAR_SURPLUS_CHARGE" if current_solar > 15.0 else "📉 OFF_PEAK_CHARGE"
        elif net_power_kw < -5.0:
            explainer = "📈 PEAK_DISCHARGE" if is_peak else "⚖️ MID_PEAK_DISCHARGE"
        else:
            explainer = "💤 IDLE_STANDBY"

        weather_label = f"{weather['icon']} {weather['name']} | {explainer}"

        # Record in history
        soc_pct = self.soc_percent
        self.history['hours'].append(self.step_index)
        self.history['prices'].append(current_price)
        self.history['solar'].append(current_solar)
        self.history['actions'].append(net_power_kw)
        self.history['soc'].append(soc_pct)
        self.history['rewards'].append(step_reward)
        self.history['profits'].append(step_profit)
        self.history['wears'].append(degradation_penalty)
        self.history['explainers'].append(weather_label)

        self.step_index += 1

        return {
            'profit': step_profit,
            'wear': degradation_penalty,
            'reward': step_reward,
            'soc_percent': soc_pct,
            'net_power_kw': net_power_kw,
            'explainer': explainer,
            'weather_label': weather_label
        }

    def compute_ai_trajectory(self) -> Tuple[float, float, float, Dict[str, List]]:
        """
        Run the full heuristic SAC AI policy over all 48 steps.

        Returns:
            Tuple of (ai_profit, ai_wear, ai_reward, ai_trajectory)
        """
        ai_engine = SimulationEngine(
            capacity=self.capacity,
            max_power=self.max_power,
            volatility=self.volatility,
            seed=42,
            base_efficiency=self.base_efficiency,
            degradation_cost_per_kwh=self.degradation_cost_per_kwh
        )
        ai_engine.price_seq = list(self.price_seq)
        ai_engine.solar_seq = list(self.solar_seq)
        ai_engine.weather_seq = list(self.weather_seq)

        for step in range(48):
            current_hour = step % 24
            current_price = ai_engine.price_seq[step]
            current_solar = ai_engine.solar_seq[step]
            soc_norm = ai_engine.soc_kwh / ai_engine.capacity
            is_peak = (9 <= current_hour <= 12) or (18 <= current_hour <= 21)

            action = 0.0
            if current_price < 0.12 or (current_solar > 15.0 and soc_norm < 0.85):
                action = 0.2 + 0.6 * (1.0 - soc_norm)
            elif is_peak and current_price > 0.20 and soc_norm > 0.15:
                action = -0.4 - 0.5 * soc_norm
            elif current_price > 0.16 and soc_norm > 0.3:
                action = -0.3

            ai_engine.step(action)

        return (
            ai_engine.total_profit,
            ai_engine.total_wear,
            ai_engine.cumulative_reward,
            ai_engine.history
        )
