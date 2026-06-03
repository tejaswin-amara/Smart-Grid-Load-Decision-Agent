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

