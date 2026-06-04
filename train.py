"""
Project: Production-Grade Smart Grid Load Decision Agent (Final Capstone)
Course: Computational Foundations for Artificial Intelligence
Author: Tejaswin Amara
Academic Standing: I Year (III Semester)
Roll Number: 2520090104
Program: CSIT, KLH University (Bachupally Campus)
"""

import logging
from pathlib import Path

from stable_baselines3 import SAC
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3.common.callbacks import EvalCallback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


from environments import GridConfig, AdvancedSmartGridEnv



def train_sac_agent(config: GridConfig) -> None:
    """
    Train a Soft Actor-Critic agent on the Smart Grid environment.
    
    Args:
        config: GridConfig instance with hyperparameters
    """
    logger.info("Starting SAC training with config: %s", config)
    
    # Create vectorized environment with 4 parallel instances
    env = DummyVecEnv([lambda: AdvancedSmartGridEnv(config=config, seed=i) for i in range(4)])
    
    # Wrap with VecNormalize for observation and reward normalization
    env = VecNormalize(env, norm_obs=True, norm_reward=True)
    
    # Create evaluation environment
    eval_env = DummyVecEnv([lambda: AdvancedSmartGridEnv(config=config, seed=9999)])
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=True, training=False)
    
    # Create model output directory
    model_dir = Path("./best_grid_model")
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Create SAC model with specified architecture
    policy_kwargs = dict(net_arch=[256, 256])
    model = SAC(
        policy="MlpPolicy",
        env=env,
        learning_rate=3e-4,
        buffer_size=100000,
        batch_size=256,
        gamma=0.99,
        tau=0.005,
        ent_coef="auto",
        target_entropy="auto",
        policy_kwargs=policy_kwargs,
        verbose=1,
        seed=42
    )
    
    # Create evaluation callback
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(model_dir),
        log_path=str(model_dir),
        eval_freq=5000,
        n_eval_episodes=5,
        deterministic=True,
        render=False
    )
    
    # Train the model
    logger.info("Training SAC model for %d timesteps", config.training_timesteps)
    model.learn(
        total_timesteps=config.training_timesteps,
        callback=eval_callback,
        progress_bar=True
    )
    
    # Save the final model
    model.save(str(model_dir / "final_model.zip"))
    logger.info("Training completed. Best model saved to %s", model_dir / "best_model.zip")
    logger.info("Final model saved to %s", model_dir / "final_model.zip")


if __name__ == "__main__":
    config = GridConfig(
        battery_capacity_kwh=100.0,
        max_power_kw=25.0,
        base_efficiency=0.95,
        degradation_cost_per_kwh=0.02,
        training_timesteps=50000
    )
    
    try:
        train_sac_agent(config)
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        raise
