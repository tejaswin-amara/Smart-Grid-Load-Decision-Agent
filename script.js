/**
 * Project: Smart Grid Load Decision Agent - GitHub Pages Logic
 * Course: Computational Foundations for Artificial Intelligence
 * Author: Tejaswin Amara
 * Academic Standing: I Year (III Semester)
 * Roll Number: 2520090104
 * Program: CSIT, KLH University (Bachupally Campus)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // INTERACTIVE SCHEMATIC CLICK HANDLERS (MICRO-INTERACTIONS)
    // -------------------------------------------------------------
    function flashCard(cardId) {
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.remove('flash-active');
            void card.offsetWidth; // Force CSS reflow to restart animation
            card.classList.add('flash-active');
            // Auto clean class after animation completes
            setTimeout(() => {
                card.classList.remove('flash-active');
            }, 1200);
        }
    }

    const nodeSolar = document.getElementById('node-solar');
    const nodeBattery = document.getElementById('node-battery');
    const nodeGrid = document.getElementById('node-grid');

    if (nodeSolar) {
        nodeSolar.addEventListener('click', () => {
            if (!isManualMode) flashCard('metric-profit-card');
            else flashCard('game-player-profit');
        });
    }
    if (nodeBattery) {
        nodeBattery.addEventListener('click', () => {
            if (!isManualMode) flashCard('metric-wear-card');
            else flashCard('game-player-wear');
        });
    }
    if (nodeGrid) {
        nodeGrid.addEventListener('click', () => {
            if (!isManualMode) {
                flashCard('metric-volatility-card');
                flashCard('metric-sharpe-card');
            } else {
                flashCard('game-player-volatility');
                flashCard('game-player-sharpe');
            }
        });
    }

    // -------------------------------------------------------------
    // ELEMENT SELECTORS
    // -------------------------------------------------------------
    const sliderCapacity = document.getElementById('battery-capacity');
    const sliderCapacityVal = document.getElementById('battery-capacity-val');
    
    const sliderMaxPower = document.getElementById('max-power');
    const sliderMaxPowerVal = document.getElementById('max-power-val');
    
    const sliderVolatility = document.getElementById('price-volatility');
    const sliderVolatilityVal = document.getElementById('price-volatility-val');
    
    const btnRunSimulation = document.getElementById('run-simulation-btn');
    
    // Mode Buttons Selectors
    const btnSimple = document.getElementById('btn-mode-simple');
    const btnAcademic = document.getElementById('btn-mode-academic');
    
    // Preset Buttons Selectors
    const presetHome = document.getElementById('preset-home');
    const presetStorm = document.getElementById('preset-storm');
    const presetSolar = document.getElementById('preset-solar');
    
    // KPI Cards Elements (Tab 1 Simulation)
    const elTotalProfit = document.getElementById('total-profit-val');
    const elProfitDelta = document.getElementById('profit-delta-val');
    const elTotalWear = document.getElementById('total-wear-val');
    const elWearDelta = document.getElementById('wear-delta-val');
    const elNetReward = document.getElementById('net-reward-val');
    const elVolatility = document.getElementById('volatility-val');
    const elSharpe = document.getElementById('sharpe-val');
    
    // Schematic Elements
    const elSchematicSolar = document.getElementById('schematic-solar-val');
    const elSchematicSoc = document.getElementById('schematic-soc-val');
    const elSchematicGrid = document.getElementById('schematic-grid-val');
    const pathSolar = document.getElementById('flow-solar-bat');
    const pathBatGrid = document.getElementById('flow-bat-grid');

    // -------------------------------------------------------------
    // GLOBAL STATE VARIABLES
    // -------------------------------------------------------------
    let batteryCapacity = parseFloat(sliderCapacity.value);
    let maxPower = parseFloat(sliderMaxPower.value);
    let priceVolatility = parseFloat(sliderVolatility.value);
    let isSimpleMode = true; // Default to Simple Mode for average user
    let isManualMode = false; // Default to Simulation Mode (Auto AI)

    // Game Mode Trajectory Stores
    let gameStep = 0;
    let gameSocKwh = 50.0;
    let gameCellTemp = 25.0;
    
    let gamePriceSequence = [];
    let gameSolarSequence = [];
    let gameWeatherSequence = [];
    
    let gameTotalProfit = 0.0;
    let gameTotalWear = 0.0;
    let gameCumulativeReward = 0.0;
    
    let gameHistory = {
        hours: [],
        prices: [],
        solarGens: [],
        actions: [],
        socTrajectory: [],
        stepRewards: [],
        profits: [],
        wears: [],
        explainers: [],
        rawExplainers: []
    };
    
    // AI Agent Game calculations
    let aiTotalProfit = 0.0;
    let aiTotalWear = 0.0;
    let aiCumulativeReward = 0.0;
    let aiHistory = {
        socTrajectory: [],
        actions: [],
        profits: [],
        wears: [],
        stepRewards: []
    };

    const LABELS = {
        academic: {
            desc: "Live interactive verification of a Soft Actor-Critic (SAC) reinforcement learning agent optimizing real-time grid energy arbitrage under volatility.",
            profit: "Total Energy Arbitrage Profit",
            wear: "Battery Wear & Degradation Cost",
            reward: "Net Policy Value (Reward)",
            volatility: "Volatility Risk Index",
            sharpe: "Risk-Adjusted Arbitrage (Sharpe)",
            configTitle: "Grid Configuration",
            capacity: "Battery Capacity",
            maxPower: "Max Power Output",
            volatilitySlider: "AR(1) Price Volatility"
        },
        simple: {
            desc: "Simulate how an AI battery agent automatically saves you money on electricity bills by storing cheap solar energy and avoiding peak pricing surges.",
            profit: "Total Electricity Bill Savings",
            wear: "Battery Lifespan Wear Cost",
            reward: "AI Agent Efficiency Score",
            volatility: "Market Price Volatility Rating",
            sharpe: "Savings Consistency Rating",
            configTitle: "Battery Parameters",
            capacity: "Battery Energy Storage Capacity",
            maxPower: "Charging / Discharging Speed",
            volatilitySlider: "Utility Price Volatility"
        }
    };

    function updateDashboardLabels() {
        const mode = isSimpleMode ? 'simple' : 'academic';
        
        document.getElementById('header-desc').innerHTML = LABELS[mode].desc;
        document.getElementById('label-profit').textContent = LABELS[mode].profit;
        document.getElementById('label-wear').textContent = LABELS[mode].wear;
        document.getElementById('label-reward').textContent = LABELS[mode].reward;
        document.getElementById('label-volatility').textContent = LABELS[mode].volatility;
        document.getElementById('label-sharpe').textContent = LABELS[mode].sharpe;
        document.getElementById('sidebar-config-title').textContent = LABELS[mode].configTitle;
        document.getElementById('label-capacity-title').textContent = LABELS[mode].capacity;
        document.getElementById('label-maxpower-title').textContent = LABELS[mode].maxPower;
        document.getElementById('label-volatility-title').textContent = LABELS[mode].volatilitySlider;
    }

    // Event listeners to update label values instantly
    sliderCapacity.addEventListener('input', (e) => {
        batteryCapacity = parseFloat(e.target.value);
        sliderCapacityVal.textContent = `${batteryCapacity} kWh`;
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    sliderMaxPower.addEventListener('input', (e) => {
        maxPower = parseFloat(e.target.value);
        sliderMaxPowerVal.textContent = `${maxPower} kW`;
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    sliderVolatility.addEventListener('input', (e) => {
        priceVolatility = parseFloat(e.target.value);
        sliderVolatilityVal.textContent = priceVolatility.toFixed(2);
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    btnRunSimulation.addEventListener('click', () => {
        runStochasticSimulation();
    });

    btnSimple.addEventListener('click', () => {
        isSimpleMode = true;
        btnSimple.classList.add('active');
        btnAcademic.classList.remove('active');
        updateDashboardLabels();
    });
    
    btnAcademic.addEventListener('click', () => {
        isSimpleMode = false;
        btnAcademic.classList.add('active');
        btnSimple.classList.remove('active');
        updateDashboardLabels();
    });

    function setPreset(capacity, power, volatility, activeBtn) {
        sliderCapacity.value = capacity;
        sliderCapacityVal.textContent = `${capacity} kWh`;
        batteryCapacity = capacity;
        
        sliderMaxPower.value = power;
        sliderMaxPowerVal.textContent = `${power} kW`;
        maxPower = power;
        
        sliderVolatility.value = volatility;
        sliderVolatilityVal.textContent = volatility.toFixed(2);
        priceVolatility = volatility;
        
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
        
        runStochasticSimulation();
    }
    
    presetHome.addEventListener('click', () => {
        setPreset(100, 25, 0.03, presetHome);
    });
    
    presetStorm.addEventListener('click', () => {
        setPreset(120, 45, 0.08, presetStorm);
    });
    
    presetSolar.addEventListener('click', () => {
        setPreset(80, 15, 0.02, presetSolar);
    });

    // -------------------------------------------------------------
    // NAVIGATION TABS WORKSPACE SYSTEM
    // -------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-link');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanelId = btn.getAttribute('aria-controls');
            
            // Toggle active classes on tab headers
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            // Toggle visibility on panels
            tabPanels.forEach(p => {
                p.style.display = 'none';
                p.classList.remove('active');
            });
            const activePanel = document.getElementById(targetPanelId);
            if (activePanel) {
                activePanel.style.display = 'flex';
                // Trigger layout reflow for animation entry
                void activePanel.offsetHeight;
                activePanel.classList.add('active');
            }
            
            // Context-sensitive sidebar controls toggle
            const presetsPanel = document.getElementById('sidebar-presets-panel');
            const configPanel = document.getElementById('sidebar-config-panel');
            
            if (targetPanelId === 'panel-simulation') {
                isManualMode = false;
                if (presetsPanel) presetsPanel.style.display = 'block';
                if (configPanel) configPanel.style.display = 'block';
                // Automatically re-run simulation to show current configurations
                runStochasticSimulation();
            } else if (targetPanelId === 'panel-game') {
                isManualMode = true;
                if (presetsPanel) presetsPanel.style.display = 'none';
                if (configPanel) configPanel.style.display = 'none';
                initGame();
            } else {
                isManualMode = false;
                if (presetsPanel) presetsPanel.style.display = 'none';
                if (configPanel) configPanel.style.display = 'none';
            }
        });
    });

    // -------------------------------------------------------------
    // INTERACTIVE GAME MODE LOGIC
    // -------------------------------------------------------------
    function initGame() {
        gameStep = 0;
        gameSocKwh = batteryCapacity / 2.0;
        gameCellTemp = 25.0;
        gameTotalProfit = 0.0;
        gameTotalWear = 0.0;
        gameCumulativeReward = 0.0;
        
        gameHistory = {
            hours: [],
            prices: [],
            solarGens: [],
            actions: [],
            socTrajectory: [],
            stepRewards: [],
            profits: [],
            wears: [],
            explainers: [],
            rawExplainers: []
        };
        
        gamePriceSequence = [];
        gameSolarSequence = [];
        gameWeatherSequence = [];
        
        const basePriceProfile = [];
        const baseSolarProfile = [];
        for (let h = 0; h < 24; h++) {
            const price = 0.15 + 0.1 * (
                Math.sin(Math.PI * (h - 6) / 12) * (h < 12 ? 1 : 0) +
                Math.sin(Math.PI * (h - 18) / 6) * (h >= 12 ? 1 : 0)
            );
            basePriceProfile.push(price);
            
            const solar = Math.max(0, 50 * Math.sin(Math.PI * (h - 6) / 12));
            baseSolarProfile.push(solar);
        }
        
        const transitionMatrix = [
            [0.75, 0.20, 0.05],
            [0.25, 0.60, 0.15],
            [0.10, 0.35, 0.55]
        ];
        const weatherNames = ["SUNNY", "CLOUDY", "STORMY"];
        const weatherIcons = ["☀️", "⛅", "⛈️"];
        const weatherMultipliers = [1.0, 0.4, 0.08];
        
        let weatherState = 0;
        let pNoise = 0.0;
        let sNoise = 0.0;
        
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            const rand = Math.random();
            let cumulativeProb = 0.0;
            let nextState = weatherState;
            for (let s = 0; s < 3; s++) {
                cumulativeProb += transitionMatrix[weatherState][s];
                if (rand <= cumulativeProb) {
                    nextState = s;
                    break;
                }
            }
            weatherState = nextState;
            const multiplier = weatherMultipliers[weatherState];
            
            const phiPrice = 0.8;
            const phiSolar = 0.7;
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            pNoise = phiPrice * pNoise + z0 * priceVolatility;
            sNoise = phiSolar * sNoise + z1 * 2.0;
            pNoise = Math.max(-0.1, Math.min(0.1, pNoise));
            sNoise = Math.max(-10.0, Math.min(10.0, sNoise));
            
            const price = Math.max(0.05, basePriceProfile[currentHour] + pNoise);
            const solar = Math.max(0.0, (baseSolarProfile[currentHour] + sNoise) * multiplier);
            
            gamePriceSequence.push(price);
            gameSolarSequence.push(solar);
            gameWeatherSequence.push({
                icon: weatherIcons[weatherState],
                name: weatherNames[weatherState]
            });
        }
        
        calculateAiAgentResponse();
        updateGameDisplay();
        updateScorecard(0.0, 0.0, 0.0, []);
        displayAiMetrics();
        setGameButtonsState(true);
        
        // Reset logs
        const gameTableBody = document.querySelector('#game-logs-table tbody');
        if (gameTableBody) gameTableBody.innerHTML = '';
        
        // Render comparison charts (AI loaded, user empty)
        renderGameComparisonCharts();
        
        // Reset visual schematic elements
        if (elSchematicSolar) elSchematicSolar.textContent = "0.0 kW";
        if (elSchematicSoc) elSchematicSoc.textContent = "50.0%";
        if (elSchematicGrid) elSchematicGrid.textContent = "Idle";
        if (pathSolar) pathSolar.style.display = 'none';
        if (pathBatGrid) pathBatGrid.style.display = 'none';
        
        const gameHelpText = document.querySelector('.game-help-text');
        if (gameHelpText) {
            gameHelpText.innerHTML = `Click the buttons below or press keyboard shortcuts <strong>[1 / C]</strong> to Charge, <strong>[2 / S]</strong> for Standby, and <strong>[3 / D]</strong> to Discharge the battery. Try to beat the Soft Actor-Critic (SAC) AI Agent's total savings score!`;
        }
    }

    function calculateAiAgentResponse() {
        let socKwh = batteryCapacity / 2.0;
        let cellTemp = 25.0;
        aiTotalProfit = 0.0;
        aiTotalWear = 0.0;
        aiCumulativeReward = 0.0;
        
        aiHistory = {
            socTrajectory: [],
            actions: [],
            profits: [],
            wears: [],
            stepRewards: []
        };
        
        const timeStepDuration = 1.0;
        const baseEfficiency = 0.95;
        const degradationCostPerKwh = 0.02;
        
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            const currentPrice = gamePriceSequence[step];
            const currentSolar = gameSolarSequence[step];
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                action = -0.3;
            }
            
            const rawPowerKw = action * maxPower;
            let smoothedPowerKw = rawPowerKw;
            if (rawPowerKw > 0) {
                const chargeBoundsFactor = 1.0 - (1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.9))));
                smoothedPowerKw = rawPowerKw * chargeBoundsFactor;
            } else if (rawPowerKw < 0) {
                const dischargeBoundsFactor = 1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.1)));
                smoothedPowerKw = rawPowerKw * dischargeBoundsFactor;
            }
            
            const maxCharge = smoothedPowerKw > 0 ? Math.min(smoothedPowerKw, maxPower) : 0;
            const maxDischarge = smoothedPowerKw < 0 ? Math.max(smoothedPowerKw, -maxPower) : 0;
            
            const availableCharge = Math.max(0, batteryCapacity - socKwh);
            const availableDischarge = socKwh;
            
            const actualChargeKw = Math.min(maxCharge, availableCharge / timeStepDuration);
            const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / timeStepDuration);
            const netPowerKw = actualChargeKw + actualDischargeKw;
            
            const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
            const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
            const efficiency = Math.max(0.7, baseEfficiency * socEfficiency * rateFactor);
            
            if (netPowerKw >= 0) {
                socKwh = Math.min(batteryCapacity, socKwh + netPowerKw * timeStepDuration * efficiency);
            } else {
                socKwh = Math.max(0, socKwh - Math.abs(netPowerKw) * timeStepDuration / efficiency);
            }
            
            const stepProfit = currentPrice * (-netPowerKw) * timeStepDuration;
            const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * timeStepDuration;
            
            const T_amb = 25.0;
            const T_nominal = 25.0;
            const R_thermal = 0.001;
            const tau = 0.1;
            const lambda_wear = 0.005;
            
            const powerSquared = netPowerKw * netPowerKw;
            cellTemp = T_amb + R_thermal * powerSquared + (1.0 - tau) * (cellTemp - T_amb);
            const tempDiff = cellTemp - T_nominal;
            const dynamicDegradationRate = degradationCostPerKwh * (1.0 + lambda_wear * (tempDiff * tempDiff));
            const degradationPenalty = dynamicDegradationRate * Math.abs(netPowerKw) * timeStepDuration;
            
            const stepReward = stepProfit + greenBonus - degradationPenalty;
            
            aiTotalProfit += stepProfit;
            aiTotalWear += degradationPenalty;
            aiCumulativeReward += stepReward;
            
            aiHistory.socTrajectory.push((socKwh / batteryCapacity) * 100);
            aiHistory.actions.push(netPowerKw);
            aiHistory.profits.push(stepProfit);
            aiHistory.wears.push(degradationPenalty);
            aiHistory.stepRewards.push(stepReward);
        }
    }

    function displayAiMetrics() {
        document.getElementById('game-ai-profit').textContent = `$${aiTotalProfit.toFixed(2)}`;
        document.getElementById('game-ai-wear').textContent = `$${aiTotalWear.toFixed(2)}`;
        document.getElementById('game-ai-reward').textContent = aiCumulativeReward.toFixed(2);
        
        if (aiHistory.stepRewards && aiHistory.stepRewards.length > 0) {
            const count = aiHistory.stepRewards.length;
            let sum = 0.0;
            for (let i = 0; i < count; i++) sum += aiHistory.stepRewards[i];
            const mean = sum / count;
            let varianceSum = 0.0;
            for (let i = 0; i < count; i++) {
                const diff = aiHistory.stepRewards[i] - mean;
                varianceSum += diff * diff;
            }
            const volatility = Math.sqrt(varianceSum / count);
            const sharpe = (mean / (volatility + 1e-6)) * 100.0;
            
            document.getElementById('game-ai-volatility').textContent = volatility.toFixed(4);
            document.getElementById('game-ai-sharpe').textContent = `${sharpe.toFixed(2)}%`;
        } else {
            document.getElementById('game-ai-volatility').textContent = "0.0000";
            document.getElementById('game-ai-sharpe').textContent = "0.00%";
        }
    }

    function updateGameDisplay() {
        const nextStep = Math.min(47, gameStep);
        const currentPrice = gamePriceSequence[nextStep];
        const currentSolar = gameSolarSequence[nextStep];
        const weather = gameWeatherSequence[nextStep];
        
        document.getElementById('game-step-val').textContent = `Hour ${gameStep}/48`;
        document.getElementById('game-price-val').textContent = `$${currentPrice.toFixed(2)}/kWh`;
        document.getElementById('game-solar-val').textContent = `${currentSolar.toFixed(1)} kW`;
        document.getElementById('game-weather-val').textContent = `${weather.icon} ${weather.name}`;
    }

    function executeGameStep(actionVal) {
        if (gameStep >= 48) return;
        
        const timeStepDuration = 1.0;
        const baseEfficiency = 0.95;
        const degradationCostPerKwh = 0.02;
        
        const currentHour = gameStep % 24;
        const currentPrice = gamePriceSequence[gameStep];
        const currentSolar = gameSolarSequence[gameStep];
        const weather = gameWeatherSequence[gameStep];
        
        const socNorm = gameSocKwh / batteryCapacity;
        
        const rawPowerKw = actionVal * maxPower;
        let smoothedPowerKw = rawPowerKw;
        if (rawPowerKw > 0) {
            const chargeBoundsFactor = 1.0 - (1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.9))));
            smoothedPowerKw = rawPowerKw * chargeBoundsFactor;
        } else if (rawPowerKw < 0) {
            const dischargeBoundsFactor = 1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.1)));
            smoothedPowerKw = rawPowerKw * dischargeBoundsFactor;
        }
        
        const maxCharge = smoothedPowerKw > 0 ? Math.min(smoothedPowerKw, maxPower) : 0;
        const maxDischarge = smoothedPowerKw < 0 ? Math.max(smoothedPowerKw, -maxPower) : 0;
        
        const availableCharge = Math.max(0, batteryCapacity - gameSocKwh);
        const availableDischarge = gameSocKwh;
        
        const actualChargeKw = Math.min(maxCharge, availableCharge / timeStepDuration);
        const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / timeStepDuration);
        const netPowerKw = actualChargeKw + actualDischargeKw;
        
        const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
        const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
        const efficiency = Math.max(0.7, baseEfficiency * socEfficiency * rateFactor);
        
        if (netPowerKw >= 0) {
            gameSocKwh = Math.min(batteryCapacity, gameSocKwh + netPowerKw * timeStepDuration * efficiency);
        } else {
            gameSocKwh = Math.max(0, gameSocKwh - Math.abs(netPowerKw) * timeStepDuration / efficiency);
        }
        
        const stepProfit = currentPrice * (-netPowerKw) * timeStepDuration;
        const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * timeStepDuration;
        
        const T_amb = 25.0;
        const T_nominal = 25.0;
        const R_thermal = 0.001;
        const tau = 0.1;
        const lambda_wear = 0.005;
        
        const powerSquared = netPowerKw * netPowerKw;
        gameCellTemp = T_amb + R_thermal * powerSquared + (1.0 - tau) * (gameCellTemp - T_amb);
        const tempDiff = gameCellTemp - T_nominal;
        const dynamicDegradationRate = degradationCostPerKwh * (1.0 + lambda_wear * (tempDiff * tempDiff));
        const degradationPenalty = dynamicDegradationRate * Math.abs(netPowerKw) * timeStepDuration;
        
        const stepReward = stepProfit + greenBonus - degradationPenalty;
        
        gameTotalProfit += stepProfit;
        gameTotalWear += degradationPenalty;
        gameCumulativeReward += stepReward;
        
        let explainer = "💤 IDLE_STANDBY";
        if (actionVal > 0) {
            if (currentSolar > 15.0) {
                explainer = "☀️ SOLAR_SURPLUS_CHARGE";
            } else {
                explainer = "📉 OFF_PEAK_CHARGE";
            }
        } else if (actionVal < 0) {
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            if (isPeak) {
                explainer = "📈 PEAK_DISCHARGE";
            } else {
                explainer = "⚖️ MID_PEAK_DISCHARGE";
            }
        }
        
        const weatherLabel = `${weather.icon} ${weather.name} | ${explainer}`;
        const finalSoc = (gameSocKwh / batteryCapacity) * 100;
        
        gameHistory.hours.push(gameStep);
        gameHistory.prices.push(currentPrice);
        gameHistory.solarGens.push(currentSolar);
        gameHistory.actions.push(netPowerKw);
        gameHistory.socTrajectory.push(finalSoc);
        gameHistory.stepRewards.push(stepReward);
        gameHistory.profits.push(stepProfit);
        gameHistory.wears.push(degradationPenalty);
        gameHistory.explainers.push(weatherLabel);
        gameHistory.rawExplainers.push(explainer);
        
        updateScorecard(gameTotalProfit, gameTotalWear, gameCumulativeReward, gameHistory.stepRewards);
        
        // -------------------------------------------------------------
        // ANIMATE SCHEMATIC PATHS DYNAMICALLY
        // -------------------------------------------------------------
        if (elSchematicSolar) elSchematicSolar.textContent = `${currentSolar.toFixed(1)} kW`;
        if (elSchematicSoc) elSchematicSoc.textContent = `${finalSoc.toFixed(1)}%`;
        
        const batteryLvlVisual = document.getElementById('visual-battery-level');
        const batteryBoltVisual = document.getElementById('visual-battery-bolt');
        if (batteryLvlVisual) {
            batteryLvlVisual.style.width = `${finalSoc.toFixed(0)}%`;
            if (finalSoc < 20.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-red) 0%, var(--color-orange) 100%)';
            } else if (finalSoc < 50.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-orange) 0%, var(--color-primary) 100%)';
            } else {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-green) 0%, var(--color-primary) 100%)';
            }
        }
        
        const isCharging = netPowerKw > 0.5;
        if (batteryBoltVisual) {
            batteryBoltVisual.style.display = isCharging ? 'block' : 'none';
        }
        
        let gridStatusText = "Idle / Balanced";
        if (netPowerKw > 0.5) {
            gridStatusText = `Importing: +${netPowerKw.toFixed(1)} kW`;
        } else if (netPowerKw < -0.5) {
            gridStatusText = `Exporting: ${netPowerKw.toFixed(1)} kW`;
        }
        if (elSchematicGrid) elSchematicGrid.textContent = gridStatusText;
        
        const isDaytime = (6 <= currentHour && currentHour <= 18);
        const isSolarActive = isDaytime && currentSolar > 2.0;
        if (pathSolar) pathSolar.style.display = isSolarActive ? 'block' : 'none';
        
        const isDischarging = netPowerKw < -0.5;
        if (pathBatGrid) {
            if (isCharging) {
                pathBatGrid.style.display = 'block';
                pathBatGrid.setAttribute('stroke', 'var(--color-green)');
                pathBatGrid.classList.add('reverse');
            } else if (isDischarging) {
                pathBatGrid.style.display = 'block';
                pathBatGrid.setAttribute('stroke', 'var(--color-red)');
                pathBatGrid.classList.remove('reverse');
            } else {
                pathBatGrid.style.display = 'none';
            }
        }

        const nodeSolar = document.getElementById('node-solar');
        const nodeBattery = document.getElementById('node-battery');
        const nodeGrid = document.getElementById('node-grid');
        if (nodeSolar) {
            if (isSolarActive) nodeSolar.classList.add('solar-active');
            else nodeSolar.classList.remove('solar-active');
        }
        if (nodeBattery) {
            if (isCharging) {
                nodeBattery.classList.add('charging-active');
                nodeBattery.classList.remove('discharging-active');
            } else if (isDischarging) {
                nodeBattery.classList.add('discharging-active');
                nodeBattery.classList.remove('charging-active');
            } else {
                nodeBattery.classList.remove('charging-active', 'discharging-active');
            }
        }
        if (nodeGrid) {
            if (isCharging || isDischarging) nodeGrid.classList.add('solar-active');
            else nodeGrid.classList.remove('solar-active');
        }

        // Add to Game Logs Table
        const gameTableBody = document.querySelector('#game-logs-table tbody');
        if (gameTableBody) {
            const playerAction = netPowerKw;
            const playerSoC = finalSoc;
            const aiAction = aiHistory.actions[gameStep];
            const aiSoC = aiHistory.socTrajectory[gameStep];
            const playerProfit = stepProfit;
            const aiProfit = aiHistory.profits[gameStep];
            
            const tr = document.createElement('tr');
            
            const actionClassPlayer = playerAction > 0.5 ? 'tag-off-peak-charge' : playerAction < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
            const actionClassAi = aiAction > 0.5 ? 'tag-off-peak-charge' : aiAction < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
            
            tr.innerHTML = `
                <td>Hour ${gameStep + 1}</td>
                <td>$${currentPrice.toFixed(2)}</td>
                <td>${currentSolar.toFixed(1)} kW</td>
                <td><span class="decision-tag ${actionClassPlayer}">${playerAction > 0.5 ? '+' + playerAction.toFixed(1) : playerAction < -0.5 ? playerAction.toFixed(1) : '0.0'} kW</span></td>
                <td>${playerSoC.toFixed(1)}%</td>
                <td><span class="decision-tag ${actionClassAi}">${aiAction > 0.5 ? '+' + aiAction.toFixed(1) : aiAction < -0.5 ? aiAction.toFixed(1) : '0.0'} kW</span></td>
                <td>${aiSoC.toFixed(1)}%</td>
                <td class="${playerProfit >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${playerProfit >= 0 ? '+$' + playerProfit.toFixed(2) : '-$' + Math.abs(playerProfit).toFixed(2)}</td>
                <td class="${aiProfit >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${aiProfit >= 0 ? '+$' + aiProfit.toFixed(2) : '-$' + Math.abs(aiProfit).toFixed(2)}</td>
                <td>${weatherLabel}</td>
            `;
            gameTableBody.appendChild(tr);
            
            // Auto-scroll table container to latest logs
            const tableContainer = gameTableBody.parentElement.parentElement;
            if (tableContainer) {
                tableContainer.scrollTop = tableContainer.scrollHeight;
            }
        }
        
        gameStep++;
        updateGameDisplay();
        renderGameComparisonCharts();
        
        if (gameStep >= 48) {
            setGameButtonsState(false);
            highlightWinner();
        }
    }

    function highlightWinner() {
        const playerScore = gameCumulativeReward;
        const aiScore = aiCumulativeReward;
        
        let message = "";
        let themeColor = "";
        if (playerScore > aiScore) {
            message = `🎉 CONGRATULATIONS! You scored ${playerScore.toFixed(2)} and beat the SAC AI Agent (Score: ${aiScore.toFixed(2)})! You are a Smart Grid Master!`;
            themeColor = 'var(--color-green)';
        } else if (playerScore === aiScore) {
            message = `⚖️ IT'S A TIE! Both you and the SAC AI Agent scored ${playerScore.toFixed(2)}! Incredible grid management skills!`;
            themeColor = 'var(--color-primary)';
        } else {
            message = `🤖 SAC AI WINS! The AI Agent scored ${aiScore.toFixed(2)}, beating your score of ${playerScore.toFixed(2)}. Don't worry, SAC agents optimize continuous action spaces with infinite policy iterations. Try again to beat the model!`;
            themeColor = 'var(--color-orange)';
        }
        
        const gameHelpText = document.querySelector('.game-help-text');
        if (gameHelpText) {
            gameHelpText.innerHTML = `<span style="color: ${themeColor}; font-size: 15px; font-weight: 700; display: block; padding: 12px; background: rgba(255,255,255,0.02); border-left: 4px solid ${themeColor}; border-radius: 0 8px 8px 0; margin-bottom: 10px;">${message}</span>`;
        }
    }

    function setGameButtonsState(enabled) {
        document.getElementById('game-btn-charge').disabled = !enabled;
        document.getElementById('game-btn-hold').disabled = !enabled;
        document.getElementById('game-btn-discharge').disabled = !enabled;
    }

    function updateScorecard(profit, wear, reward, stepRewards) {
        if (!isManualMode) {
            elTotalProfit.textContent = `$${profit.toFixed(2)}`;
            elProfitDelta.textContent = `$${(profit / 2.0).toFixed(2)} / day`;
            
            elTotalWear.textContent = `$${wear.toFixed(2)}`;
            elWearDelta.textContent = `-$${(wear / 2.0).toFixed(2)} / day`;
            
            elNetReward.textContent = reward.toFixed(2);
            
            if (stepRewards && stepRewards.length > 1) {
                const count = stepRewards.length;
                let sum = 0.0;
                for (let i = 0; i < count; i++) sum += stepRewards[i];
                const mean = sum / count;
                let varianceSum = 0.0;
                for (let i = 0; i < count; i++) {
                    const diff = stepRewards[i] - mean;
                    varianceSum += diff * diff;
                }
                const volatility = Math.sqrt(varianceSum / count);
                const sharpe = (mean / (volatility + 1e-6)) * 100.0;
                
                elVolatility.textContent = volatility.toFixed(4);
                elSharpe.textContent = `${sharpe.toFixed(2)}%`;
            } else {
                elVolatility.textContent = "0.0000";
                elSharpe.textContent = "0.00%";
            }
        } else {
            // Update manual game scorecard
            document.getElementById('game-player-profit').textContent = `$${profit.toFixed(2)}`;
            document.getElementById('game-player-wear').textContent = `$${wear.toFixed(2)}`;
            document.getElementById('game-player-reward').textContent = reward.toFixed(2);
            
            if (stepRewards && stepRewards.length > 1) {
                const count = stepRewards.length;
                let sum = 0.0;
                for (let i = 0; i < count; i++) sum += stepRewards[i];
                const mean = sum / count;
                let varianceSum = 0.0;
                for (let i = 0; i < count; i++) {
                    const diff = stepRewards[i] - mean;
                    varianceSum += diff * diff;
                }
                const volatility = Math.sqrt(varianceSum / count);
                const sharpe = (mean / (volatility + 1e-6)) * 100.0;
                
                document.getElementById('game-player-volatility').textContent = volatility.toFixed(4);
                document.getElementById('game-player-sharpe').textContent = `${sharpe.toFixed(2)}%`;
            } else {
                document.getElementById('game-player-volatility').textContent = "0.0000";
                document.getElementById('game-player-sharpe').textContent = "0.00%";
            }
        }
    }

    document.getElementById('game-btn-charge').addEventListener('click', () => {
        executeGameStep(1.0);
    });
    
    document.getElementById('game-btn-hold').addEventListener('click', () => {
        executeGameStep(0.0);
    });
    
    document.getElementById('game-btn-discharge').addEventListener('click', () => {
        executeGameStep(-1.0);
    });
    
    document.getElementById('game-btn-reset').addEventListener('click', () => {
        initGame();
    });

    // -------------------------------------------------------------
    // KEYBOARD SHORTCUTS FOR GAME PLAY
    // -------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (!isManualMode || gameStep >= 48) return;

        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        switch (e.key.toLowerCase()) {
            case '1':
            case 'c':
                e.preventDefault();
                executeGameStep(1.0);   // Charge
                break;
            case '2':
            case 's':
                e.preventDefault();
                executeGameStep(0.0);   // Standby
                break;
            case '3':
            case 'd':
                e.preventDefault();
                executeGameStep(-1.0);  // Discharge
                break;
        }
    });

    // -------------------------------------------------------------
    // STOCHASTIC SIMULATION CORE (AUTO AI MODE)
    // -------------------------------------------------------------
    function runStochasticSimulation() {
        if (isManualMode) return;
        
        const timeStepDuration = 1.0; // 1 hour
        const baseEfficiency = 0.95;
        const degradationCostPerKwh = 0.02;
        
        const basePriceProfile = [];
        const baseSolarProfile = [];
        for (let h = 0; h < 24; h++) {
            const price = 0.15 + 0.1 * (
                Math.sin(Math.PI * (h - 6) / 12) * (h < 12 ? 1 : 0) +
                Math.sin(Math.PI * (h - 18) / 6) * (h >= 12 ? 1 : 0)
            );
            basePriceProfile.push(price);
            
            const solar = Math.max(0, 50 * Math.sin(Math.PI * (h - 6) / 12));
            baseSolarProfile.push(solar);
        }

        let socKwh = batteryCapacity / 2.0; // Start at 50% SoC
        let priceNoise = 0.0;
        let solarNoise = 0.0;
        
        let weatherState = 0; 
        const weatherNames = ["SUNNY", "CLOUDY", "STORMY"];
        const weatherIcons = ["☀️", "⛅", "⛈️"];
        const weatherMultipliers = [1.0, 0.4, 0.08];
        const transitionMatrix = [
            [0.75, 0.20, 0.05],
            [0.25, 0.60, 0.15],
            [0.10, 0.35, 0.55]
        ];
        
        const hours = [];
        const prices = [];
        const solarGens = [];
        const actions = [];
        const socTrajectory = [];
        const stepRewards = [];
        const profits = [];
        const wears = [];
        const explainers = [];
        const rawExplainers = [];
        
        let totalProfit = 0.0;
        let totalWear = 0.0;
        let cumulativeReward = 0.0;
        let cellTemp = 25.0;

        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            
            const rand = Math.random();
            let cumulativeProb = 0.0;
            let nextState = weatherState;
            for (let s = 0; s < 3; s++) {
                cumulativeProb += transitionMatrix[weatherState][s];
                if (rand <= cumulativeProb) {
                    nextState = s;
                    break;
                }
            }
            weatherState = nextState;
            const weatherMultiplier = weatherMultipliers[weatherState];
            
            const phiPrice = 0.8;
            const phiSolar = 0.7;
            
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            priceNoise = phiPrice * priceNoise + z0 * priceVolatility;
            solarNoise = phiSolar * solarNoise + z1 * 2.0;
            
            priceNoise = Math.max(-0.1, Math.min(0.1, priceNoise));
            solarNoise = Math.max(-10.0, Math.min(10.0, solarNoise));
            
            const currentPrice = Math.max(0.05, basePriceProfile[currentHour] + priceNoise);
            const currentSolar = Math.max(0.0, (baseSolarProfile[currentHour] + solarNoise) * weatherMultiplier);
            
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                action = -0.3;
            }
            
            const rawPowerKw = action * maxPower;
            let smoothedPowerKw = rawPowerKw;
            if (rawPowerKw > 0) {
                const chargeBoundsFactor = 1.0 - (1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.9))));
                smoothedPowerKw = rawPowerKw * chargeBoundsFactor;
            } else if (rawPowerKw < 0) {
                const dischargeBoundsFactor = 1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.1)));
                smoothedPowerKw = rawPowerKw * dischargeBoundsFactor;
            }
            
            const maxCharge = smoothedPowerKw > 0 ? Math.min(smoothedPowerKw, maxPower) : 0;
            const maxDischarge = smoothedPowerKw < 0 ? Math.max(smoothedPowerKw, -maxPower) : 0;
            
            const availableCharge = Math.max(0, batteryCapacity - socKwh);
            const availableDischarge = socKwh;
            
            const actualChargeKw = Math.min(maxCharge, availableCharge / timeStepDuration);
            const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / timeStepDuration);
            const netPowerKw = actualChargeKw + actualDischargeKw;
            
            const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
            const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
            const efficiency = Math.max(0.7, baseEfficiency * socEfficiency * rateFactor);
            
            if (netPowerKw >= 0) {
                socKwh = Math.min(batteryCapacity, socKwh + netPowerKw * timeStepDuration * efficiency);
            } else {
                socKwh = Math.max(0, socKwh - Math.abs(netPowerKw) * timeStepDuration / efficiency);
            }
            
            const stepProfit = currentPrice * (-netPowerKw) * timeStepDuration;
            const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * timeStepDuration;
            
            const T_amb = 25.0;
            const T_nominal = 25.0;
            const R_thermal = 0.001;
            const tau = 0.1;
            const lambda_wear = 0.005;
            
            const powerSquared = netPowerKw * netPowerKw;
            cellTemp = T_amb + R_thermal * powerSquared + (1.0 - tau) * (cellTemp - T_amb);
            const tempDiff = cellTemp - T_nominal;
            const dynamicDegradationRate = degradationCostPerKwh * (1.0 + lambda_wear * (tempDiff * tempDiff));
            const degradationPenalty = dynamicDegradationRate * Math.abs(netPowerKw) * timeStepDuration;
            
            const stepReward = stepProfit + greenBonus - degradationPenalty;
            
            totalProfit += stepProfit;
            totalWear += degradationPenalty;
            cumulativeReward += stepReward;
            
            let explainer = "💤 IDLE_STANDBY";
            if (action > 0) {
                if (currentSolar > 15.0) {
                    explainer = "☀️ SOLAR_SURPLUS_CHARGE";
                } else {
                    explainer = "📉 OFF_PEAK_CHARGE";
                }
            } else if (action < 0) {
                if (isPeak) {
                    explainer = "📈 PEAK_DISCHARGE";
                } else {
                    explainer = "⚖️ MID_PEAK_DISCHARGE";
                }
            }
            
            const weatherLabel = `${weatherIcons[weatherState]} ${weatherNames[weatherState]} | ${explainer}`;
            
            hours.push(step);
            prices.push(currentPrice);
            solarGens.push(currentSolar);
            actions.push(netPowerKw);
            socTrajectory.push((socKwh / batteryCapacity) * 100);
            stepRewards.push(stepReward);
            profits.push(stepProfit);
            wears.push(degradationPenalty);
            explainers.push(weatherLabel);
            rawExplainers.push(explainer);
        }

        updateScorecard(totalProfit, totalWear, cumulativeReward, stepRewards);
        
        // Update live schematic with final step values
        const lastStepIdx = 47;
        if (elSchematicSolar) elSchematicSolar.textContent = `${solarGens[lastStepIdx].toFixed(1)} kW`;
        const lastSoc = socTrajectory[lastStepIdx];
        if (elSchematicSoc) elSchematicSoc.textContent = `${lastSoc.toFixed(1)}%`;
        
        const batteryLvlVisual = document.getElementById('visual-battery-level');
        const batteryBoltVisual = document.getElementById('visual-battery-bolt');
        if (batteryLvlVisual) {
            batteryLvlVisual.style.width = `${lastSoc.toFixed(0)}%`;
            if (lastSoc < 20.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-red) 0%, var(--color-orange) 100%)';
            } else if (lastSoc < 50.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-orange) 0%, var(--color-primary) 100%)';
            } else {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-green) 0%, var(--color-primary) 100%)';
            }
        }
        
        const isCharging = actions[lastStepIdx] > 0.5;
        if (batteryBoltVisual) {
            batteryBoltVisual.style.display = isCharging ? 'block' : 'none';
        }
        
        let gridStatusText = "Idle / Balanced";
        if (actions[lastStepIdx] > 0.5) {
            gridStatusText = `Importing: +${actions[lastStepIdx].toFixed(1)} kW`;
        } else if (actions[lastStepIdx] < -0.5) {
            gridStatusText = `Exporting: ${actions[lastStepIdx].toFixed(1)} kW`;
        }
        if (elSchematicGrid) elSchematicGrid.textContent = gridStatusText;
        
        const isDaytime = true; // Solar arrays active
        if (pathSolar) pathSolar.style.display = solarGens[lastStepIdx] > 2.0 ? 'block' : 'none';
        
        const isDischarging = actions[lastStepIdx] < -0.5;
        if (pathBatGrid) {
            if (isCharging) {
                pathBatGrid.style.display = 'block';
                pathBatGrid.setAttribute('stroke', 'var(--color-green)');
                pathBatGrid.classList.add('reverse');
            } else if (isDischarging) {
                pathBatGrid.style.display = 'block';
                pathBatGrid.setAttribute('stroke', 'var(--color-red)');
                pathBatGrid.classList.remove('reverse');
            } else {
                pathBatGrid.style.display = 'none';
            }
        }

        // Render Simulation Plotly Charts
        renderMarketChart(hours, prices, solarGens, actions);
        renderSocChart(hours, socTrajectory);

        // Update Hourly Simulation Table Logs
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            for (let i = 0; i < 48; i++) {
                const tr = document.createElement('tr');
                const actionClass = actions[i] > 0.5 ? 'tag-off-peak-charge' : actions[i] < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
                tr.innerHTML = `
                    <td>Hour ${i + 1}</td>
                    <td>$${prices[i].toFixed(2)}</td>
                    <td>${solarGens[i].toFixed(1)} kW</td>
                    <td><span class="decision-tag ${actionClass}">${actions[i] > 0.5 ? '+' + actions[i].toFixed(1) : actions[i] < -0.5 ? actions[i].toFixed(1) : '0.0'} kW</span></td>
                    <td>${socTrajectory[i].toFixed(1)}%</td>
                    <td class="${profits[i] >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${profits[i] >= 0 ? '+$' + profits[i].toFixed(2) : '-$' + Math.abs(profits[i]).toFixed(2)}</td>
                    <td class="metric-delta negative">-$${wears[i].toFixed(2)}</td>
                    <td>${stepRewards[i].toFixed(2)}</td>
                    <td>${explainers[i]}</td>
                `;
                tableBody.appendChild(tr);
            }
        }
    }

    // -------------------------------------------------------------
    // PLOTLY CHART RENDERERS
    // -------------------------------------------------------------
    function renderMarketChart(hours, prices, solarGens, actions) {
        const tracePrice = {
            x: hours,
            y: prices,
            name: 'Electricity Price ($/kWh)',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#E71D36', width: 2.5 }
        };

        const traceSolar = {
            x: hours,
            y: solarGens,
            name: 'Solar Output (kW)',
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            opacity: 0.15,
            fillcolor: 'rgba(255, 159, 28, 0.25)',
            line: { color: '#FF9F1C', width: 1 },
            yaxis: 'y2'
        };

        const barColors = actions.map(x => x >= 0 ? '#2EC4B6' : '#E71D36');
        const traceDispatch = {
            x: hours,
            y: actions,
            name: 'Agent Power Flow (kW)',
            type: 'bar',
            marker: { color: barColors },
            opacity: 0.8,
            yaxis: 'y2'
        };

        const layout = {
            title: {
                text: 'Stochastic Market Interface & SAC Agent Power Dispatch Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 60 },
            legend: { orientation: 'h', x: 0.5, y: 1.1, xanchor: 'center' },
            xaxis: {
                title: 'Simulation Time (Hours)',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4
            },
            yaxis: {
                title: 'Electricity Price ($/kWh)',
                color: '#FF4B4B',
                gridcolor: 'rgba(255,255,255,0.05)'
            },
            yaxis2: {
                title: 'Power Flow / Dispatch (kW)',
                color: '#2EC4B6',
                overlaying: 'y',
                side: 'right',
                gridcolor: 'transparent'
            }
        };

        const skeletonMarket = document.getElementById('skeleton-market');
        if (skeletonMarket) skeletonMarket.remove();

        Plotly.newPlot('market-chart', [tracePrice, traceSolar, traceDispatch], layout, { responsive: true, displayModeBar: false });
    }

    function renderSocChart(hours, socTrajectory) {
        const traceSoc = {
            x: hours,
            y: socTrajectory,
            name: 'State of Charge (%)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3A86C8', width: 3 },
            marker: { color: '#00F5D4', size: 5 }
        };

        const layout = {
            title: {
                text: 'Battery State-of-Charge (SoC) Trajectory Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 40 },
            xaxis: {
                title: 'Simulation Time (Hours)',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4
            },
            yaxis: {
                title: 'State-of-Charge (%)',
                range: [-2, 102],
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };

        const skeletonSoc = document.getElementById('skeleton-soc');
        if (skeletonSoc) skeletonSoc.remove();

        Plotly.newPlot('soc-chart', [traceSoc], layout, { responsive: true, displayModeBar: false });
    }

    function renderGameComparisonCharts() {
        // 1. SoC comparison chart
        const tracePlayerSoc = {
            x: gameHistory.hours,
            y: gameHistory.socTrajectory,
            name: 'Your SoC (%)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#00F5D4', width: 3 },
            marker: { color: '#00F5D4', size: 6 }
        };
        
        const traceAiSoc = {
            x: Array.from({length: 48}, (_, i) => i),
            y: aiHistory.socTrajectory,
            name: 'AI Agent SoC (%)',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#7B2CBF', width: 2.5, dash: 'dash' }
        };
        
        const layoutSoc = {
            title: {
                text: 'SoC Trajectory Comparison: You vs. SAC AI Agent',
                font: { family: 'Outfit', size: 15, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 50, b: 40, l: 50, r: 20 },
            legend: { orientation: 'h', x: 0.5, y: 1.15, xanchor: 'center' },
            xaxis: {
                title: 'Hour',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4,
                range: [0, 47]
            },
            yaxis: {
                title: 'State-of-Charge (%)',
                range: [-5, 105],
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };
        
        Plotly.newPlot('game-soc-comparison', [traceAiSoc, tracePlayerSoc], layoutSoc, { responsive: true, displayModeBar: false });
        
        // 2. Action comparison chart (bar chart)
        const tracePlayerAction = {
            x: gameHistory.hours,
            y: gameHistory.actions,
            name: 'Your Dispatch (kW)',
            type: 'bar',
            marker: { color: 'rgba(0, 245, 212, 0.7)' }
        };
        
        const traceAiAction = {
            x: Array.from({length: 48}, (_, i) => i),
            y: aiHistory.actions,
            name: 'AI Agent Dispatch (kW)',
            type: 'bar',
            marker: { color: 'rgba(123, 44, 191, 0.45)' }
        };
        
        const layoutAction = {
            title: {
                text: 'Power Dispatch Actions: You vs. SAC AI Agent',
                font: { family: 'Outfit', size: 15, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 50, b: 40, l: 50, r: 20 },
            legend: { orientation: 'h', x: 0.5, y: 1.15, xanchor: 'center' },
            barmode: 'group',
            xaxis: {
                title: 'Hour',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4,
                range: [0, 47]
            },
            yaxis: {
                title: 'Power Dispatch (kW)',
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };
        
        Plotly.newPlot('game-action-comparison', [traceAiAction, tracePlayerAction], layoutAction, { responsive: true, displayModeBar: false });
    }

    // -------------------------------------------------------------
    // ACCESSIBILITY & THEMING HANDLERS
    // -------------------------------------------------------------
    const btnTextDecrease = document.getElementById('btn-text-decrease');
    const btnTextReset = document.getElementById('btn-text-reset');
    const btnTextIncrease = document.getElementById('btn-text-increase');
    const btnContrastToggle = document.getElementById('btn-contrast-toggle');
    
    btnTextDecrease.addEventListener('click', () => {
        document.body.classList.remove('text-size-lg');
        document.body.classList.add('text-size-sm');
        btnTextDecrease.classList.add('active');
        btnTextReset.classList.remove('active');
        btnTextIncrease.classList.remove('active');
        localStorage.setItem('grid-text-size', 'sm');
    });
    
    btnTextReset.addEventListener('click', () => {
        document.body.classList.remove('text-size-sm', 'text-size-lg');
        btnTextDecrease.classList.remove('active');
        btnTextReset.classList.add('active');
        btnTextIncrease.classList.remove('active');
        localStorage.setItem('grid-text-size', 'md');
    });
    
    btnTextIncrease.addEventListener('click', () => {
        document.body.classList.remove('text-size-sm');
        document.body.classList.add('text-size-lg');
        btnTextDecrease.classList.remove('active');
        btnTextReset.classList.remove('active');
        btnTextIncrease.classList.add('active');
        localStorage.setItem('grid-text-size', 'lg');
    });
    
    btnContrastToggle.addEventListener('click', () => {
        const isContrast = document.body.classList.toggle('high-contrast');
        btnContrastToggle.classList.toggle('active', isContrast);
        localStorage.setItem('grid-high-contrast', isContrast ? 'true' : 'false');
    });
    
    // Restore settings from localStorage on load
    const savedTextSize = localStorage.getItem('grid-text-size');
    if (savedTextSize === 'sm') {
        btnTextDecrease.click();
    } else if (savedTextSize === 'lg') {
        btnTextIncrease.click();
    }
    
    const savedContrast = localStorage.getItem('grid-high-contrast');
    if (savedContrast === 'true') {
        btnContrastToggle.click();
    }

    // -------------------------------------------------------------
    // ONBOARDING GUIDED TOUR STATE MACHINE
    // -------------------------------------------------------------
    let tourStep = 0;
    const tourSteps = [
        {
            elementId: 'sidebar-mode-panel',
            title: '🏡 Dashboard Mode',
            description: 'You can switch the entire dashboard between <strong>Simple View</strong> (using natural terms like "bill savings" for laypeople) and <strong>Academic View</strong> (showing raw reinforcement learning terms like MDP variables and policy values).'
        },
        {
            elementId: 'tab-btn-sim',
            title: '📊 Navigation Tabs',
            description: 'Switch between the <strong>Real-Time Simulation</strong>, the <strong>Interactive Game</strong> (where you play against the AI), the <strong>Math reference block</strong>, and the <strong>System Guide</strong>.'
        },
        {
            elementId: 'sidebar-config-panel',
            title: '⚙️ Grid Configuration',
            description: 'Adjust variables like battery storage capacity, charging rates, and pricing volatility, and run new simulations dynamically.'
        },
        {
            elementId: 'node-battery',
            title: '🔌 Live Flow Schematic',
            description: 'This interactive schematic updates in real-time. Connections animate with dash flow speeds mapping energy direction. Click any node to flash highlight its matching KPI card below!'
        },
        {
            elementId: 'tab-btn-game',
            title: '🎮 Test Your Skills!',
            description: 'Ready to try beating the SAC agent? Switch to the <strong>Interactive Grid Game</strong> tab, where you manually charge/discharge the battery hour-by-hour and see how your decisions compare to the AI.'
        }
    ];

    function showTourStep(index) {
        if (index < 0 || index >= tourSteps.length) {
            endTour();
            return;
        }
        tourStep = index;
        const step = tourSteps[index];
        
        // Clean previous highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        
        // Highlight active element
        const targetEl = document.getElementById(step.elementId);
        if (targetEl) {
            targetEl.classList.add('tour-highlight');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Update overlay card
        const overlay = document.getElementById('tour-overlay');
        const badge = document.getElementById('tour-badge');
        const title = document.getElementById('tour-title');
        const desc = document.getElementById('tour-description');
        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');
        
        if (overlay) overlay.style.display = 'flex';
        if (badge) badge.textContent = `Step ${index + 1} of ${tourSteps.length}`;
        if (title) title.textContent = step.title;
        if (desc) desc.innerHTML = step.description;
        
        if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        if (nextBtn) nextBtn.textContent = index === tourSteps.length - 1 ? 'Finish' : 'Next \u2192';
    }
    
    function endTour() {
        document.getElementById('tour-overlay').style.display = 'none';
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    document.getElementById('btn-start-tour').addEventListener('click', () => {
        showTourStep(0);
    });
    
    document.getElementById('tour-prev').addEventListener('click', () => {
        showTourStep(tourStep - 1);
    });
    
    document.getElementById('tour-next').addEventListener('click', () => {
        showTourStep(tourStep + 1);
    });
    
    document.getElementById('tour-close').addEventListener('click', () => {
        endTour();
    });
    
    document.getElementById('tour-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tour-overlay')) {
            endTour();
        }
    });

    // Run initial simulation and setup labels on load
    updateDashboardLabels();
    runStochasticSimulation();
});
