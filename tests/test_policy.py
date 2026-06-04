"""
Project: Stochastic Smart Grid Load Decision Agent
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
Academic Standing: I Year (III Semester)

Test suite for the heuristic SAC policy (run_heuristic_sac_policy) from app.py.
"""

import os
import sys
import types
import numpy as np
import pytest

# Add the parent directory to the path so we can import app and environments
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock heavy dependencies that app.py imports at module level so tests
# can run without streamlit / plotly / stable-baselines3 installed.
class _MockModule(types.ModuleType):
    """Module stub that returns itself for any attribute access."""
    def __getattr__(self, name):
        return _MockModule(name)
    def __call__(self, *args, **kwargs):
        return self

for _mod_name in [
    'streamlit', 'plotly', 'plotly.graph_objects', 'plotly.subplots',
    'stable_baselines3',
]:
    if _mod_name not in sys.modules:
        _mock = _MockModule(_mod_name)
        # streamlit needs a few specific callables to survive import-time decorators
        if _mod_name == 'streamlit':
            _mock.cache_resource = lambda f=None, **kw: (f if f else (lambda fn: fn))
        sys.modules[_mod_name] = _mock

from environments import GridConfig
from app import run_heuristic_sac_policy



@pytest.fixture
def config():
    """Default GridConfig for policy tests."""
    return GridConfig()


def test_charge_at_low_price(config):
    """Low price (50.0), low SoC (0.3) should produce negative action (charging)."""
    obs = np.array([0.3, 50.0, 0.0, 3.0], dtype=np.float32)  # SoC=0.3, price=50, solar=0, hour=3
    action = run_heuristic_sac_policy(obs, config)
    assert action[0] < 0, (
        f"Agent should CHARGE (negative action) at low price=50, soc=0.3; got action={action[0]:.4f}"
    )


def test_discharge_at_peak(config):
    """High price (200.0), peak hour (18), high SoC (0.8) should produce positive action (discharging)."""
    obs = np.array([0.8, 200.0, 0.0, 18.0], dtype=np.float32)  # SoC=0.8, price=200, solar=0, hour=18
    action = run_heuristic_sac_policy(obs, config)
    assert action[0] > 0, (
        f"Agent should DISCHARGE (positive action) at peak price=200, hour=18, soc=0.8; got action={action[0]:.4f}"
    )


def test_idle_at_mid_price(config):
    """Mid price (140.0), off-peak hour (14), mid SoC (0.5) should produce near-zero action."""
    obs = np.array([0.5, 140.0, 0.0, 14.0], dtype=np.float32)  # SoC=0.5, price=140, solar=0, hour=14
    action = run_heuristic_sac_policy(obs, config)
    # At price=140 (< 150), soc=0.5 (> 0.3 but not triggered because price < 150 for mid-peak),
    # and hour=14 is off-peak, so the else branch fires: action = 0.0
    assert abs(action[0]) < config.max_power_kw * 0.5, (
        f"Agent should be near idle at mid-price=140, hour=14, soc=0.5; got action={action[0]:.4f}"
    )


def test_solar_surplus_charge(config):
    """High solar (0.5), low SoC (0.3) should charge regardless of price."""
    # Even at a high price, solar > 0.2 and soc < 0.85 triggers charging
    obs = np.array([0.3, 180.0, 0.5, 12.0], dtype=np.float32)  # SoC=0.3, price=180, solar=0.5, hour=12
    action = run_heuristic_sac_policy(obs, config)
    assert action[0] < 0, (
        f"Agent should CHARGE when solar=0.5 and soc=0.3 even at price=180; got action={action[0]:.4f}"
    )


def test_action_shape(config):
    """Output should always be np.ndarray with shape (1,)."""
    obs = np.array([0.5, 150.0, 0.0, 12.0], dtype=np.float32)
    action = run_heuristic_sac_policy(obs, config)
    assert isinstance(action, np.ndarray), f"Action must be np.ndarray, got {type(action)}"
    assert action.shape == (1,), f"Action shape must be (1,), got {action.shape}"
