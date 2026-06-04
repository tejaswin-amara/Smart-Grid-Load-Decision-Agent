"""
Test suite for the SimulationEngine module.

NOTE: These tests will fail until simulation.py is created by another agent.
This is expected and intentional.
"""

import os
import sys
import numpy as np
import pytest

# Add the parent directory to the path so we can import simulation
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from simulation import SimulationEngine


class TestSimulationEngine:
    """Tests for SimulationEngine initialization, sequence generation, and physics."""

    def test_engine_initialization(self):
        """Engine initializes with correct defaults."""
        engine = SimulationEngine()
        assert engine.soc_kwh == pytest.approx(50.0), "Default SoC should be capacity/2 = 50.0 kWh"
        assert engine.cell_temp == pytest.approx(25.0), "Default cell temp should be 25.0°C"
        assert engine.total_profit == pytest.approx(0.0), "Initial profit should be 0"
        assert engine.total_wear == pytest.approx(0.0), "Initial wear should be 0"
        assert engine.cumulative_reward == pytest.approx(0.0), "Initial reward should be 0"

    def test_engine_custom_initialization(self):
        """Engine initializes with custom parameters."""
        engine = SimulationEngine(capacity=200.0, max_power=50.0, volatility=0.05)
        assert engine.soc_kwh == pytest.approx(100.0), "Custom capacity 200 -> SoC should start at 100.0"

    def test_sequence_generation(self):
        """48 steps generated, all prices > 0, all solar >= 0."""
        engine = SimulationEngine()
        price_seq, solar_seq, weather_seq = engine.generate_sequences()

        assert len(price_seq) == 48, f"Price sequence must have 48 entries, got {len(price_seq)}"
        assert len(solar_seq) == 48, f"Solar sequence must have 48 entries, got {len(solar_seq)}"
        assert len(weather_seq) == 48, f"Weather sequence must have 48 entries, got {len(weather_seq)}"

        assert all(p > 0 for p in price_seq), "All prices must be > 0"
        assert all(s >= 0 for s in solar_seq), "All solar values must be >= 0"

    def test_weather_markov_chain(self):
        """Weather states are valid (0, 1, or 2)."""
        engine = SimulationEngine()
        _, _, weather_seq = engine.generate_sequences()

        valid_states = {0, 1, 2}
        for i, w in enumerate(weather_seq):
            # weather_seq entries may be ints or dicts with a state key
            state = w if isinstance(w, int) else w.get('state', w)
            if isinstance(state, dict):
                # If dict with 'name', validate name string
                assert state.get('name') in ["SUNNY", "CLOUDY", "STORMY"], (
                    f"Weather name at step {i} is invalid: {state.get('name')}"
                )
            else:
                assert state in valid_states, (
                    f"Weather state at step {i} must be 0, 1, or 2; got {state}"
                )

    def test_step_physics(self):
        """Single step updates SoC correctly."""
        engine = SimulationEngine()
        engine.generate_sequences()
        initial_soc = engine.soc_kwh

        result = engine.step(10.0)  # Discharge 10 kW

        assert isinstance(result, dict), "step() must return a dict"
        assert 'profit' in result, "Result must contain 'profit'"
        assert 'wear' in result, "Result must contain 'wear'"
        assert 'reward' in result, "Result must contain 'reward'"
        assert 'soc_percent' in result, "Result must contain 'soc_percent'"
        assert 'explainer' in result, "Result must contain 'explainer'"

        # SoC should have changed after a non-zero action
        assert engine.soc_kwh != initial_soc or initial_soc == 0.0, (
            "SoC should change after a discharge action"
        )
        assert engine.soc_kwh >= 0.0, "SoC must remain >= 0"

    def test_full_game_trajectory(self):
        """48 steps complete without error, history has 48 entries."""
        engine = SimulationEngine()
        engine.generate_sequences()

        for step in range(48):
            # Alternate between charge and discharge
            action = -5.0 if step % 2 == 0 else 5.0
            result = engine.step(action)
            assert isinstance(result, dict), f"step() at step {step} must return a dict"

        history = engine.history
        assert isinstance(history, dict), "history must be a dict"

        # Check that at least one list in history has 48 entries
        for key, values in history.items():
            assert len(values) == 48, (
                f"history['{key}'] should have 48 entries, got {len(values)}"
            )

    def test_reset(self):
        """Reset returns engine to initial state."""
        engine = SimulationEngine()
        engine.generate_sequences()
        engine.step(10.0)
        engine.step(-10.0)

        engine.reset()

        assert engine.soc_kwh == pytest.approx(50.0), "SoC should reset to capacity/2"
        assert engine.total_profit == pytest.approx(0.0), "Profit should reset to 0"
        assert engine.total_wear == pytest.approx(0.0), "Wear should reset to 0"
        assert engine.cumulative_reward == pytest.approx(0.0), "Reward should reset to 0"
