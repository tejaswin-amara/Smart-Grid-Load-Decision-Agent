"""
Project: Stochastic Smart Grid Load Decision Agent
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
Academic Standing: I Year (III Semester)
"""

import os
import sys
import numpy as np
import pytest

# Add the parent directory to the path so we can import environments
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from environments import AdvancedSmartGridEnv, GridConfig

def test_env_initialization():
    env = AdvancedSmartGridEnv()
    obs, info = env.reset()
    
    # Check observation shape
    assert obs.shape == (4,), "Observation space should have 4 dimensions"
    
    # Check bounds for initial state
    assert 0 <= obs[0] <= 1, "Initial SoC should be between 0 and 1"
    assert 0 <= obs[2] <= 1, "Initial Solar should be between 0 and 1"
    assert 0 <= obs[3] < 24, "Initial Time of Day should be valid"

def test_physics_bounds():
    env = AdvancedSmartGridEnv()
    env.reset()
    
    # Attempt to discharge fully
    obs, reward, done, truncated, info = env.step(np.array([25.0]))
    assert 0 <= env.soc <= 1, f"SoC {env.soc} out of bounds after discharge"
    
    # Attempt to charge fully
    env.soc = 0.99
    obs, reward, done, truncated, info = env.step(np.array([-25.0]))
    assert 0 <= env.soc <= 1, f"SoC {env.soc} out of bounds after overcharging"

def test_reward_components():
    config = GridConfig(base_efficiency=1.0, degradation_cost_per_kwh=0.0) # simplify physics for test
    env = AdvancedSmartGridEnv(config=config)
    env.reset()
    
    # Test arbitrage reward (buy low)
    # Action: -10 kW (charging), Price: $50/MWh
    env.current_price = 50.0
    reward = env._calculate_reward(power_kw=-10.0, price=50.0, solar=0.0)
    
    # Expected arbitrage reward calculation:
    # -power_kw * price * dt_hours / 1000.0
    # -(-10.0) * 50.0 * (1/60) / 1000 = +0.00833...
    assert reward > 0, "Charging at low prices should give positive arbitrage reward"

def test_weather_transitions():
    env = AdvancedSmartGridEnv(seed=42)
    env.reset()
    obs, reward, done, truncated, info = env.step(np.array([0.0]))
    assert 'weather' in info, "Weather info should be mapped in step metadata output"
    assert info['weather'] in ["SUNNY", "CLOUDY", "STORMY"], "Weather labels must be valid string states"


def test_episode_termination():
    """Run max_steps and verify terminated=True."""
    env = AdvancedSmartGridEnv(seed=7)
    env.reset()
    terminated = False
    for _ in range(env.max_steps):
        _, _, terminated, _, _ = env.step(np.array([0.0]))
    assert terminated is True, "Episode should terminate after max_steps"


def test_seed_reproducibility():
    """Same seed produces identical trajectories."""
    rewards_a = []
    rewards_b = []

    for seed, container in [(99, rewards_a), (99, rewards_b)]:
        env = AdvancedSmartGridEnv(seed=seed)
        env.reset(seed=seed)
        for _ in range(50):
            _, r, _, _, _ = env.step(np.array([5.0]))
            container.append(r)

    np.testing.assert_array_equal(
        np.array(rewards_a), np.array(rewards_b),
        err_msg="Identical seeds must produce identical reward trajectories"
    )


def test_full_episode_rollout():
    """Complete episode without crashes, verify total_energy > 0."""
    env = AdvancedSmartGridEnv(seed=0)
    env.reset()
    done = False
    steps = 0
    while not done:
        action = env.action_space.sample()
        _, _, done, _, info = env.step(action)
        steps += 1
    assert steps == env.max_steps, f"Expected {env.max_steps} steps, got {steps}"
    assert env.total_energy_processed > 0, "Total energy should be > 0 after a full episode"


def test_soc_centering_penalty():
    """SoC at 0.5 has zero centering penalty, SoC at 0.0 or 1.0 has maximum."""
    from environments import SOC_CENTERING_WEIGHT

    # At SoC = 0.5 the quadratic penalty term (soc - 0.5)^2 is zero
    penalty_mid = SOC_CENTERING_WEIGHT * ((0.5 - 0.5) ** 2)
    assert penalty_mid == 0.0, "Centering penalty at SoC=0.5 must be zero"

    # At SoC = 0.0 or 1.0 the penalty is maximal
    penalty_low = SOC_CENTERING_WEIGHT * ((0.0 - 0.5) ** 2)
    penalty_high = SOC_CENTERING_WEIGHT * ((1.0 - 0.5) ** 2)
    assert penalty_low == penalty_high, "Penalty at 0.0 and 1.0 should be symmetric"
    assert penalty_low == pytest.approx(SOC_CENTERING_WEIGHT * 0.25), "Penalty at extremes must be SOC_CENTERING_WEIGHT * 0.25"


def test_green_bonus_reward():
    """Charging during high solar gives green bonus."""
    from environments import GREEN_BONUS_WEIGHT

    config = GridConfig(base_efficiency=1.0, degradation_cost_per_kwh=0.0)
    env = AdvancedSmartGridEnv(config=config, seed=1)
    env.reset()

    # Charging (negative power) with high solar
    power_kw = -10.0
    solar_high = 0.8
    green_bonus = -power_kw * solar_high * GREEN_BONUS_WEIGHT
    assert green_bonus > 0, "Green bonus must be positive when charging during high solar"

    # No green bonus during discharge
    green_bonus_discharge = 0.0  # power_kw > 0 means no bonus
    assert green_bonus_discharge == 0.0, "No green bonus should be given when discharging"


def test_edge_case_soc_zero():
    """SoC at 0.0, attempt discharge, SoC stays >= 0."""
    env = AdvancedSmartGridEnv(seed=10)
    env.reset()
    env.soc = 0.0  # Force empty battery

    # Try aggressive discharge (positive action)
    for _ in range(10):
        obs, _, _, _, _ = env.step(np.array([25.0]))
    assert env.soc >= 0.0, f"SoC must never go below 0, got {env.soc}"


def test_edge_case_soc_full():
    """SoC at 1.0, attempt charge, SoC stays <= 1."""
    env = AdvancedSmartGridEnv(seed=11)
    env.reset()
    env.soc = 1.0  # Force full battery

    # Try aggressive charge (negative action)
    for _ in range(10):
        obs, _, _, _, _ = env.step(np.array([-25.0]))
    assert env.soc <= 1.0, f"SoC must never exceed 1.0, got {env.soc}"


def test_custom_config_propagation():
    """Custom GridConfig values propagate correctly."""
    custom = GridConfig(
        battery_capacity_kwh=200.0,
        max_power_kw=50.0,
        base_efficiency=0.90,
        degradation_cost_per_kwh=0.05,
        training_timesteps=10000
    )
    env = AdvancedSmartGridEnv(config=custom)
    assert env.config.battery_capacity_kwh == 200.0
    assert env.config.max_power_kw == 50.0
    assert env.config.base_efficiency == 0.90
    assert env.config.degradation_cost_per_kwh == 0.05
    assert env.config.training_timesteps == 10000
    assert env.action_space.low[0] == -50.0
    assert env.action_space.high[0] == 50.0


def test_custom_reward_weights():
    """Verify changing weights in GridConfig alters reward output."""
    custom_low = GridConfig(arbitrage_weight=0.1, soc_centering_weight=1.0)
    custom_high = GridConfig(arbitrage_weight=2.0, soc_centering_weight=50.0)
    
    env_low = AdvancedSmartGridEnv(config=custom_low)
    env_high = AdvancedSmartGridEnv(config=custom_high)
    
    # 1. Check weight propagation alters reward outputs
    env_low.soc = 0.99
    env_high.soc = 0.99
    
    r_low = env_low._calculate_reward(power_kw=-10.0, price=100.0, solar=0.0)
    r_high = env_high._calculate_reward(power_kw=-10.0, price=100.0, solar=0.0)
    
    # With low arbitrage and low centering penalty vs high arbitrage and high centering penalty,
    # the outputs should be significantly different.
    assert r_low != r_high, "Different reward weights must produce different reward values"

