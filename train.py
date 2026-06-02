'''
Project: Production-Grade Smart Grid Load Decision Agent (Final Capstone)
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Academic Standing: I Year (III Semester)
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
'''

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from stable_baselines3 import SAC
from stable_baselines3.common.callbacks import EvalCallback
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
LOGGER = logging.getLogger(__name__)


@dataclass
class GridConfig:
    battery_capacity_kwh: float = 100.0
    max_power_kw: float = 25.0
    base_efficiency: float = 0.95
    degradation_cost_per_kwh: float = 0.02
    green_bonus_coefficient: float = 0.02
    training_timesteps: int = 50000
    rollout_horizon_hours: int = 24
    obs_clip_threshold: float = 10.0
    price_ar1_coefficient: float = 0.8
    solar_ar1_coefficient: float = 0.7
    price_noise_std: float = 4.0
    solar_noise_std: float = 3.0


class AdvancedSmartGridEnv(gym.Env[np.ndarray, np.ndarray]):
    metadata = {"render_modes": []}

    def __init__(self, config: GridConfig | None = None, horizon_hours: int = 24):
        super().__init__()
        self.config = config or GridConfig()
        self.horizon_hours = horizon_hours
        self.action_space = spaces.Box(
            low=-1.0,
            high=1.0,
            shape=(1,),
            dtype=np.float32,
        )
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 200.0, 100.0, 23.0], dtype=np.float32),
            dtype=np.float32,
        )
        self.price_ar1_coefficient = self.config.price_ar1_coefficient
        self.solar_ar1_coefficient = self.config.solar_ar1_coefficient
        self.price_noise_std = self.config.price_noise_std
        self.solar_noise_std = self.config.solar_noise_std
        self._rng = np.random.default_rng()
        self.current_step = 0
        self.current_hour = 0
        self.state_of_charge = 0.5
        self.price = 0.0
        self.solar_generation = 0.0
        self._prev_price_base = 0.0
        self._prev_solar_base = 0.0

    def _price_base_curve(self, hour: int) -> float:
        daily = 65.0 + 18.0 * np.sin((2.0 * np.pi * (hour - 7)) / 24.0)
        peak = 12.0 * np.sin((4.0 * np.pi * (hour - 17)) / 24.0)
        return float(np.clip(daily + peak, 20.0, 130.0))

    def _solar_base_curve(self, hour: int) -> float:
        daylight = np.sin(np.pi * (hour - 6) / 12.0)
        return float(np.clip(38.0 * max(daylight, 0.0), 0.0, 70.0))

    def _charging_efficiency(self, soc: float) -> float:
        nonlinear_penalty = 1.0 - 0.30 * soc**2 - 0.15 * soc**4
        return float(np.clip(self.config.base_efficiency * nonlinear_penalty, 0.55, 1.0))

    def _advance_stochastic_processes(self) -> None:
        current_hour_24h = self.current_hour % 24
        price_base = self._price_base_curve(current_hour_24h)
        solar_base = self._solar_base_curve(current_hour_24h)
        price_noise = self._rng.normal(0.0, self.price_noise_std)
        solar_noise = self._rng.normal(0.0, self.solar_noise_std)
        # AR(1) dynamics are applied to residuals around the hourly sinusoidal baseline.
        self.price = float(
            np.clip(
                price_base
                + self.price_ar1_coefficient * (self.price - self._prev_price_base)
                + price_noise,
                5.0,
                200.0,
            )
        )
        self.solar_generation = float(
            np.clip(
                solar_base
                + self.solar_ar1_coefficient
                * (self.solar_generation - self._prev_solar_base)
                + solar_noise,
                0.0,
                100.0,
            )
        )
        self._prev_price_base = price_base
        self._prev_solar_base = solar_base

    def _get_observation(self) -> np.ndarray:
        return np.array(
            [
                self.state_of_charge,
                self.price,
                self.solar_generation,
                float(self.current_hour),
            ],
            dtype=np.float32,
        )

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict[str, Any] | None = None,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        self.current_step = 0
        self.current_hour = 0
        self.state_of_charge = float(self._rng.uniform(0.25, 0.75))
        self._prev_price_base = self._price_base_curve(self.current_hour)
        self._prev_solar_base = self._solar_base_curve(self.current_hour)
        self.price = float(
            np.clip(
                self._prev_price_base + self._rng.normal(0.0, self.price_noise_std),
                5.0,
                200.0,
            )
        )
        self.solar_generation = float(
            np.clip(
                self._prev_solar_base + self._rng.normal(0.0, self.solar_noise_std),
                0.0,
                100.0,
            )
        )
        return self._get_observation(), {}

    def step(
        self, action: np.ndarray
    ) -> tuple[np.ndarray, float, bool, bool, dict[str, float]]:
        clipped_action = float(np.clip(action[0], -1.0, 1.0))
        requested_power_kw = clipped_action * self.config.max_power_kw
        capacity = self.config.battery_capacity_kwh
        available_charge_kwh = (1.0 - self.state_of_charge) * capacity
        available_discharge_kwh = self.state_of_charge * capacity
        processed_energy_kwh = 0.0
        net_grid_energy_kwh = 0.0

        if requested_power_kw < 0.0:
            charging_efficiency = self._charging_efficiency(self.state_of_charge)
            requested_grid_import_kwh = min(-requested_power_kw, self.config.max_power_kw)
            storable_energy_kwh = min(
                requested_grid_import_kwh * charging_efficiency,
                available_charge_kwh,
            )
            actual_grid_import_kwh = storable_energy_kwh / max(charging_efficiency, 1e-6)
            self.state_of_charge += storable_energy_kwh / capacity
            processed_energy_kwh = storable_energy_kwh
            net_grid_energy_kwh = -actual_grid_import_kwh
        else:
            requested_discharge_kwh = min(requested_power_kw, self.config.max_power_kw)
            battery_output_kwh = min(requested_discharge_kwh, available_discharge_kwh)
            delivered_energy_kwh = battery_output_kwh * self.config.base_efficiency
            self.state_of_charge -= battery_output_kwh / capacity
            processed_energy_kwh = battery_output_kwh
            net_grid_energy_kwh = delivered_energy_kwh

        self.state_of_charge = float(np.clip(self.state_of_charge, 0.0, 1.0))
        financial_arbitrage = self.price * net_grid_energy_kwh
        charging_kwh = max(-net_grid_energy_kwh, 0.0)
        green_bonus = self.config.green_bonus_coefficient * self.solar_generation * charging_kwh
        degradation_penalty = self.config.degradation_cost_per_kwh * abs(processed_energy_kwh)
        reward = financial_arbitrage + green_bonus - degradation_penalty

        self.current_step += 1
        self.current_hour = (self.current_hour + 1) % 24
        self._advance_stochastic_processes()

        terminated = self.current_step >= self.horizon_hours
        truncated = False
        info = {
            "financial_reward": float(financial_arbitrage),
            "green_bonus": float(green_bonus),
            "degradation_penalty": float(degradation_penalty),
            "net_grid_energy_kwh": float(net_grid_energy_kwh),
            "processed_energy_kwh": float(processed_energy_kwh),
            "state_of_charge": float(self.state_of_charge),
            "price": float(self.price),
            "solar_generation": float(self.solar_generation),
            "hour": float(self.current_hour),
        }
        return self._get_observation(), float(reward), terminated, truncated, info


def train_agent() -> None:
    config = GridConfig()
    model_dir = Path("./best_grid_model")
    logs_dir = Path("./logs")
    model_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)
    LOGGER.info("Initializing training environment.")
    training_env = DummyVecEnv(
        [
            lambda: AdvancedSmartGridEnv(
                config=config,
                horizon_hours=config.rollout_horizon_hours,
            )
        ]
    )
    training_env = VecNormalize(
        training_env,
        norm_obs=True,
        norm_reward=True,
        clip_obs=config.obs_clip_threshold,
    )
    eval_env = DummyVecEnv(
        [
            lambda: AdvancedSmartGridEnv(
                config=config,
                horizon_hours=config.rollout_horizon_hours,
            )
        ]
    )
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(model_dir),
        log_path=str(logs_dir),
        eval_freq=5000,
        deterministic=True,
        render=False,
    )
    model = SAC(
        "MlpPolicy",
        training_env,
        policy_kwargs=dict(net_arch=[256, 256]),
        verbose=1,
        tensorboard_log=str(logs_dir / "tensorboard"),
    )
    LOGGER.info("Training SAC model for %d timesteps.", config.training_timesteps)
    model.learn(total_timesteps=config.training_timesteps, callback=eval_callback)
    model.save(str(model_dir / "final_model"))
    training_env.save(str(model_dir / "vecnormalize.pkl"))
    LOGGER.info("Training complete. Best model stored at ./best_grid_model/best_model.zip")
    eval_env.close()
    training_env.close()


if __name__ == "__main__":
    train_agent()
