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

logger = logging.getLogger(__name__)

# Configurable Reward Weights
ARBITRAGE_WEIGHT = 1.0       # Multiplier for financial arbitrage profit per kW
GREEN_BONUS_WEIGHT = 0.5     # $ bonus per kW @ 100% solar
WEAR_WEIGHT_MULTIPLIER = 1.0 # Multiplier applied to the dynamic degradation cost
SOC_CENTERING_WEIGHT = 10.0  # Quadratic penalty multiplier to stay at 50% SoC


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
        self.cell_temp: float = 25.0
        
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
        
        # Action space smoothing via soft-sigmoid to prevent extreme draws near bounds
        if power_kw < 0:  # Charging
            charge_bounds_factor = 1.0 - (1.0 / (1.0 + np.exp(-20.0 * (self.soc - 0.9))))
            smoothed_power_kw = power_kw * charge_bounds_factor
            
            efficiency = self._calculate_charging_efficiency(self.soc)
            # Account for efficiency loss
            power_demand = -smoothed_power_kw / efficiency
            # Limit by available capacity
            max_charge_rate = (1.0 - self.soc) * self.config.battery_capacity_kwh / dt_hours
            actual_power = -min(power_demand, max_charge_rate) * efficiency
        else:  # Discharging
            discharge_bounds_factor = 1.0 / (1.0 + np.exp(-20.0 * (self.soc - 0.1)))
            smoothed_power_kw = power_kw * discharge_bounds_factor
            
            # Limit by available energy
            max_discharge_rate = self.soc * self.config.battery_capacity_kwh / dt_hours
            # Note: A real battery would also have discharge losses, modeled as actual_power_released = actual_power * efficiency
            # Here we follow the previous simplified model where discharge efficiency is 1.0
            actual_power = min(smoothed_power_kw, max_discharge_rate)
        
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
        4. Efficiency Bonus: Penalty for staying at extremes
        """
        dt_hours = 1.0 / 60.0
        
        # 1. Financial Arbitrage Reward
        # Negative power (charging) at low price is good
        # Positive power (discharging) at high price is good
        arbitrage_reward = -power_kw * price * dt_hours / 1000.0
        arbitrage_reward *= ARBITRAGE_WEIGHT
        
        # 2. Green Bonus: Reward charging during high solar
        green_bonus = 0.0
        if power_kw < 0:  # Charging
            green_bonus = -power_kw * solar * GREEN_BONUS_WEIGHT
        
        # 3. Degradation Penalty
        # Battery degradation is proportional to energy throughput
        energy_processed = abs(power_kw) * dt_hours
        
        # Dynamic Thermal Wear Calculus
        T_amb = 25.0
        T_nominal = 25.0
        R_thermal = 0.001 # lower resistance for scaled power
        tau = 0.1
        lambda_wear = 0.005
        
        # Update cell temperature (I^2 * R approximated by power_kw^2)
        power_squared = power_kw ** 2
        self.cell_temp = T_amb + R_thermal * power_squared + (1.0 - tau) * (self.cell_temp - T_amb)
        
        temp_diff = self.cell_temp - T_nominal
        dynamic_degradation_rate = self.config.degradation_cost_per_kwh * (1.0 + lambda_wear * (temp_diff ** 2))
        
        degradation_penalty = energy_processed * dynamic_degradation_rate * WEAR_WEIGHT_MULTIPLIER
        
        # 4. Efficiency Bonus (encourage staying at mid-SoC)
        soc_penalty = -SOC_CENTERING_WEIGHT * ((self.soc - 0.5) ** 2)
        
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
        self.cell_temp = 25.0
        
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
