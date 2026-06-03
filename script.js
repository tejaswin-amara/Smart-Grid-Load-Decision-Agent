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
    
    // KPI Cards Elements
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
    // PARAMETERS & SYNC WITH UI
    // -------------------------------------------------------------
    let batteryCapacity = parseFloat(sliderCapacity.value);
    let maxPower = parseFloat(sliderMaxPower.value);
    let priceVolatility = parseFloat(sliderVolatility.value);
    let isSimpleMode = true; // Default to Simple Mode for average user

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
        
        document.getElementById('header-desc').textContent = LABELS[mode].desc;
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
        runStochasticSimulation();
    });

    sliderMaxPower.addEventListener('input', (e) => {
        maxPower = parseFloat(e.target.value);
        sliderMaxPowerVal.textContent = `${maxPower} kW`;
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        runStochasticSimulation();
    });

    sliderVolatility.addEventListener('input', (e) => {
        priceVolatility = parseFloat(e.target.value);
        sliderVolatilityVal.textContent = priceVolatility.toFixed(2);
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        runStochasticSimulation();
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
        setPreset(150, 45, 0.08, presetStorm);
    });
    
    presetSolar.addEventListener('click', () => {
        setPreset(120, 15, 0.01, presetSolar);
    });

    // -------------------------------------------------------------
    // PLAY GAME / MANUAL CONTROLS STATE & LOGIC
    // -------------------------------------------------------------
    const btnControlAuto = document.getElementById('btn-control-auto');
    const btnControlManual = document.getElementById('btn-control-manual');
    const panelPresets = document.getElementById('sidebar-presets-panel');
    const panelConfig = document.getElementById('sidebar-config-panel');
    const panelGame = document.getElementById('sidebar-game-panel');
    
    let isManualMode = false;
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
    
    let aiTotalProfit = 0.0;
    let aiTotalWear = 0.0;
    let aiCumulativeReward = 0.0;

    btnControlAuto.addEventListener('click', () => {
        isManualMode = false;
        btnControlAuto.classList.add('active');
        btnControlManual.classList.remove('active');
        panelPresets.style.display = 'block';
        panelConfig.style.display = 'block';
        panelGame.style.display = 'none';
        runStochasticSimulation();
    });
    
    btnControlManual.addEventListener('click', () => {
        isManualMode = true;
        btnControlManual.classList.add('active');
        btnControlAuto.classList.remove('active');
        panelPresets.style.display = 'none';
        panelConfig.style.display = 'none';
        panelGame.style.display = 'block';
        initGame();
    });

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
        setGameButtonsState(true);
        
        renderMarketChart([], [], [], []);
        renderSocChart([], []);
        
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (tableBody) tableBody.innerHTML = '';
    }

    function calculateAiAgentResponse() {
        let socKwh = batteryCapacity / 2.0;
        let cellTemp = 25.0;
        aiTotalProfit = 0.0;
        aiTotalWear = 0.0;
        aiCumulativeReward = 0.0;
        
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
        }
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
        
        gameHistory.hours.push(gameStep);
        gameHistory.prices.push(currentPrice);
        gameHistory.solarGens.push(currentSolar);
        gameHistory.actions.push(netPowerKw);
        gameHistory.socTrajectory.push((gameSocKwh / batteryCapacity) * 100);
        gameHistory.stepRewards.push(stepReward);
        gameHistory.profits.push(stepProfit);
        gameHistory.wears.push(degradationPenalty);
        gameHistory.explainers.push(weatherLabel);
        gameHistory.rawExplainers.push(explainer);
        
        updateScorecard(gameTotalProfit, gameTotalWear, gameCumulativeReward, gameHistory.stepRewards);
        
        if (elSchematicSolar) elSchematicSolar.textContent = `${currentSolar.toFixed(1)} kW`;
        const finalSoc = (gameSocKwh / batteryCapacity) * 100;
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
        
        // Append row to logs table
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (tableBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${gameStep}h</td>
                <td>$${(currentPrice * 1000.0).toFixed(2)}</td>
                <td>${(currentSolar * 2.0).toFixed(1)}%</td>
                <td>${netPowerKw >= 0 ? '+' : ''}${netPowerKw.toFixed(2)} kW</td>
                <td>${finalSoc.toFixed(1)}%</td>
                <td>$${stepProfit.toFixed(3)}</td>
                <td>$${degradationPenalty.toFixed(3)}</td>
                <td>${stepReward.toFixed(3)}</td>
                <td><span class="decision-tag tag-${explainer.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${weatherLabel}</span></td>
            `;
            tableBody.appendChild(tr);
        }
        
        renderMarketChart(gameHistory.hours, gameHistory.prices, gameHistory.solarGens, gameHistory.actions);
        renderSocChart(gameHistory.hours, gameHistory.socTrajectory);
        
        gameStep++;
        
        if (gameStep < 48) {
            updateGameDisplay();
        } else {
            setGameButtonsState(false);
            document.getElementById('game-step-val').textContent = "48h Complete!";
            alert(`🎮 Simulation Complete!\n\nYour Profit: $${gameTotalProfit.toFixed(2)} (AI Agent: $${aiTotalProfit.toFixed(2)})\nYour Cumulative Reward: ${gameCumulativeReward.toFixed(2)} (AI Agent: ${aiCumulativeReward.toFixed(2)})\n\nCompare your dispatch decisions on the charts!`);
        }
    }

    function updateGameDisplay() {
        const nextPrice = gamePriceSequence[gameStep];
        const nextSolar = gameSolarSequence[gameStep];
        const nextWeather = gameWeatherSequence[gameStep];
        
        document.getElementById('game-step-val').textContent = `Hour ${gameStep}/48`;
        document.getElementById('game-price-val').textContent = `$${(nextPrice * 1000.0).toFixed(2)}/MWh`;
        document.getElementById('game-solar-val').textContent = `${(nextSolar * 2.0).toFixed(1)}%`;
        document.getElementById('game-weather-val').textContent = `${nextWeather.icon} ${nextWeather.name}`;
    }

    function setGameButtonsState(enabled) {
        document.getElementById('game-btn-charge').disabled = !enabled;
        document.getElementById('game-btn-hold').disabled = !enabled;
        document.getElementById('game-btn-discharge').disabled = !enabled;
    }

    function updateScorecard(profit, wear, reward, stepRewards) {
        elTotalProfit.textContent = `$${profit.toFixed(2)}`;
        elProfitDelta.textContent = `$${(profit / (gameStep > 0 ? (gameStep / 24.0) : 2.0)).toFixed(2)} / day`;
        
        elTotalWear.textContent = `$${wear.toFixed(2)}`;
        elWearDelta.textContent = `-$${(wear / (gameStep > 0 ? (gameStep / 24.0) : 2.0)).toFixed(2)} / day`;
        
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
    // STOCHASTIC SIMULATION CORE
    // -------------------------------------------------------------
    function runStochasticSimulation() {
        if (isManualMode) return;
        
        const timeStepDuration = 1.0; // 1 hour
        const baseEfficiency = 0.95;
        const degradationCostPerKwh = 0.02;
        
        // Setup base profiles
        const basePriceProfile = [];
        const baseSolarProfile = [];
        for (let h = 0; h < 24; h++) {
            // Price curve: peaks morning and evening
            const price = 0.15 + 0.1 * (
                Math.sin(Math.PI * (h - 6) / 12) * (h < 12 ? 1 : 0) +
                Math.sin(Math.PI * (h - 18) / 6) * (h >= 12 ? 1 : 0)
            );
            basePriceProfile.push(price);
            
            // Solar irradiance: normal curve during daytime
            const solar = Math.max(0, 50 * Math.sin(Math.PI * (h - 6) / 12));
            baseSolarProfile.push(solar);
        }

        // Initialize state variables
        let socKwh = batteryCapacity / 2.0; // Start at 50% SoC
        let priceNoise = 0.0;
        let solarNoise = 0.0;
        
        // Markov Chain Weather initial state (0 = Sunny, 1 = Cloudy, 2 = Stormy)
        let weatherState = 0; 
        const weatherNames = ["SUNNY", "CLOUDY", "STORMY"];
        const weatherIcons = ["☀️", "⛅", "⛈️"];
        const weatherMultipliers = [1.0, 0.4, 0.08];
        const transitionMatrix = [
            [0.75, 0.20, 0.05], // Sunny transitions
            [0.25, 0.60, 0.15], // Cloudy transitions
            [0.10, 0.35, 0.55]  // Stormy transitions
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
        const rawExplainers = []; // keep raw for CSS classes
        
        let totalProfit = 0.0;
        let totalWear = 0.0;
        let cumulativeReward = 0.0;
        let cellTemp = 25.0;

        // Run 48-hour simulation
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            
            // Update weather state using Markov Chain transitions
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
            
            // 1. AR(1) Stochastic update process
            const phiPrice = 0.8;
            const phiSolar = 0.7;
            
            // Box-Muller transform to generate standard normal Gaussian noise
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            priceNoise = phiPrice * priceNoise + z0 * priceVolatility;
            solarNoise = phiSolar * solarNoise + z1 * 2.0;
            
            // Bound stochastic noise
            priceNoise = Math.max(-0.1, Math.min(0.1, priceNoise));
            solarNoise = Math.max(-10.0, Math.min(10.0, solarNoise));
            
            const currentPrice = Math.max(0.05, basePriceProfile[currentHour] + priceNoise);
            const currentSolar = Math.max(0.0, (baseSolarProfile[currentHour] + solarNoise) * weatherMultiplier);
            
            // 2. SAC Actor Heuristic Neural-Network Policy
            // Decision inputs: soc_norm, price_norm, solar_norm, hour
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                // Low price or high solar: charge battery
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                // Peak demand high price: discharge to grid
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                // Mid peak arbitrage
                action = -0.3;
            }
            
            // 3. Environment Physics and Dynamic Efficiency Constraints
            const rawPowerKw = action * maxPower;
            
            // Action space smoothing via soft-sigmoid to prevent extreme draws near bounds
            let smoothedPowerKw = rawPowerKw;
            if (rawPowerKw > 0) { // Charging
                const chargeBoundsFactor = 1.0 - (1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.9))));
                smoothedPowerKw = rawPowerKw * chargeBoundsFactor;
            } else if (rawPowerKw < 0) { // Discharging
                const dischargeBoundsFactor = 1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.1)));
                smoothedPowerKw = rawPowerKw * dischargeBoundsFactor;
            }
            
            // Feasible bounds matching state limits
            const maxCharge = smoothedPowerKw > 0 ? Math.min(smoothedPowerKw, maxPower) : 0;
            const maxDischarge = smoothedPowerKw < 0 ? Math.max(smoothedPowerKw, -maxPower) : 0;
            
            const availableCharge = Math.max(0, batteryCapacity - socKwh);
            const availableDischarge = socKwh;
            
            const actualChargeKw = Math.min(maxCharge, availableCharge / timeStepDuration);
            const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / timeStepDuration);
            
            const netPowerKw = actualChargeKw + actualDischargeKw;
            
            // Non-linear efficiency calculus
            const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
            const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
            const efficiency = Math.max(0.7, baseEfficiency * socEfficiency * rateFactor);
            
            // State transitions
            if (netPowerKw >= 0) {
                socKwh = Math.min(batteryCapacity, socKwh + netPowerKw * timeStepDuration * efficiency);
            } else {
                socKwh = Math.max(0, socKwh - Math.abs(netPowerKw) * timeStepDuration / efficiency);
            }
            
            // Multi-objective reward shaping
            const stepProfit = currentPrice * (-netPowerKw) * timeStepDuration;
            const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * timeStepDuration;
            
            // Dynamic Thermal Wear Calculus
            const T_amb = 25.0;
            const T_nominal = 25.0;
            const R_thermal = 0.001; // lower resistance for scaled power
            const tau = 0.1;
            const lambda_wear = 0.005;
            
            const powerSquared = netPowerKw * netPowerKw;
            cellTemp = T_amb + R_thermal * powerSquared + (1.0 - tau) * (cellTemp - T_amb);
            const tempDiff = cellTemp - T_nominal;
            const dynamicDegradationRate = degradationCostPerKwh * (1.0 + lambda_wear * (tempDiff * tempDiff));
            
            const degradationPenalty = dynamicDegradationRate * Math.abs(netPowerKw) * timeStepDuration;
            
            const stepReward = stepProfit + greenBonus - degradationPenalty;
            
            // Heuristic explanation
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
            
            // Generate weather-prefixed explanation text
            const weatherLabel = `${weatherIcons[weatherState]} ${weatherNames[weatherState]} | ${explainer}`;
            
            // Accumulate metrics
            totalProfit += stepProfit;
            totalWear += degradationPenalty;
            cumulativeReward += stepReward;
            
            // Record logs
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

        // -------------------------------------------------------------
        // UPDATE METRIC CARDS
        // -------------------------------------------------------------
        elTotalProfit.textContent = `$${totalProfit.toFixed(2)}`;
        elProfitDelta.textContent = `$${(totalProfit / 2.0).toFixed(2)} / day`;
        
        elTotalWear.textContent = `$${totalWear.toFixed(2)}`;
        elWearDelta.textContent = `-$${(totalWear / 2.0).toFixed(2)} / day`;
        
        elNetReward.textContent = cumulativeReward.toFixed(2);
        
        // -------------------------------------------------------------
        // UPDATE LIVE GRID SCHEMATIC & POWER FLOW PATHS
        // -------------------------------------------------------------
        const finalSolar = solarGens[47];
        const finalSoc = socTrajectory[47];
        const finalNetPower = actions[47];
        const finalHour = hours[47] % 24;
        
        if (elSchematicSolar) elSchematicSolar.textContent = `${finalSolar.toFixed(1)} kW`;
        if (elSchematicSoc) elSchematicSoc.textContent = `${finalSoc.toFixed(1)}%`;
        
        const batteryLvlVisual = document.getElementById('visual-battery-level');
        const batteryBoltVisual = document.getElementById('visual-battery-bolt');
        const isCharging = finalNetPower > 0.5;
        
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
        if (batteryBoltVisual) {
            batteryBoltVisual.style.display = isCharging ? 'block' : 'none';
        }
        
        let gridStatusText = "Idle / Balanced";
        if (finalNetPower > 0.5) {
            gridStatusText = `Importing: +${finalNetPower.toFixed(1)} kW`;
        } else if (finalNetPower < -0.5) {
            gridStatusText = `Exporting: ${finalNetPower.toFixed(1)} kW`;
        }
        if (elSchematicGrid) elSchematicGrid.textContent = gridStatusText;
        
        // Solar path active if daytime (6h to 18h) and weather solar is high
        const isDaytime = (6 <= finalHour && finalHour <= 18);
        const isSolarActive = isDaytime && finalSolar > 2.0;
        if (pathSolar) {
            pathSolar.style.display = isSolarActive ? 'block' : 'none';
        }
        
        const isDischarging = finalNetPower < -0.5;
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

        // 12-Hour Rolling Volatility Risk & Sharpe Ratio calculation
        const windowSize = 12;
        let recentRewardsSum = 0.0;
        for (let i = 48 - windowSize; i < 48; i++) {
            recentRewardsSum += stepRewards[i];
        }
        const meanReward = recentRewardsSum / windowSize;
        
        let sumSquaredDiffs = 0.0;
        for (let i = 48 - windowSize; i < 48; i++) {
            const diff = stepRewards[i] - meanReward;
            sumSquaredDiffs += diff * diff;
        }
        const volatilityRisk = Math.sqrt(sumSquaredDiffs / windowSize);
        const sharpeRatio = (meanReward / (volatilityRisk + 1e-6)) * 100.0;

        if (elVolatility) elVolatility.textContent = volatilityRisk.toFixed(4);
        if (elSharpe) elSharpe.textContent = `${sharpeRatio.toFixed(2)}% (12h)`;

        // Render detailed hourly logs in the expandable table
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            for (let i = 0; i < 48; i++) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${hours[i]}h</td>
                    <td>$${(prices[i] * 1000.0).toFixed(2)}</td>
                    <td>${(solarGens[i] * 2.0).toFixed(1)}%</td>
                    <td>${actions[i] >= 0 ? '+' : ''}${actions[i].toFixed(2)} kW</td>
                    <td>${socTrajectory[i].toFixed(1)}%</td>
                    <td>$${profits[i].toFixed(3)}</td>
                    <td>$${wears[i].toFixed(3)}</td>
                    <td>${stepRewards[i].toFixed(3)}</td>
                    <td><span class="decision-tag tag-${rawExplainers[i].toLowerCase().replace(/[^a-z0-9]/g, '-')}">${explainers[i]}</span></td>
                `;
                tableBody.appendChild(tr);
            }
        }

        // -------------------------------------------------------------
        // RENDER INTERACTIVE CHARTS
        // -------------------------------------------------------------
        renderMarketChart(hours, prices, solarGens, actions);
        renderSocChart(hours, socTrajectory);
    }

    // -------------------------------------------------------------
    // PLOTLY CHART BUILDERS
    // -------------------------------------------------------------
    function renderMarketChart(hours, prices, solarGens, actions) {
        const tracePrice = {
            x: hours,
            y: prices,
            name: 'Electricity Price ($/kWh)',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#FF4B4B', width: 3 }
        };

        const traceSolar = {
            x: hours,
            y: solarGens,
            name: 'Solar Power (kW)',
            type: 'scatter',
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

        Plotly.newPlot('soc-chart', [traceSoc], layout, { responsive: true, displayModeBar: false });
    }

    // Run initial simulation and setup labels on load
    updateDashboardLabels();
    runStochasticSimulation();
});

