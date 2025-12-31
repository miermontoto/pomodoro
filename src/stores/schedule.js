import { reactive } from 'vue';
import { SCHEDULE_PRESETS, DEFAULT_SCHEDULE_ID, parseCustomSchedule } from '../config/schedules.js';

const STORAGE_KEY = 'pomodoro-schedule';
const CUSTOM_STORAGE_KEY = 'pomodoro-custom-schedule';

// cargar estado inicial desde localStorage
const loadFromStorage = () => {
	const savedId = localStorage.getItem(STORAGE_KEY);
	const savedCustom = localStorage.getItem(CUSTOM_STORAGE_KEY);

	let customConfig = null;
	if (savedCustom) {
		const parsed = parseCustomSchedule(savedCustom);
		if (parsed.config) {
			customConfig = parsed.config;
		}
	}

	return {
		currentId: savedId && (SCHEDULE_PRESETS[savedId] || savedId === 'custom') ? savedId : DEFAULT_SCHEDULE_ID,
		customConfig,
		customJson: savedCustom || '',
	};
};

const initialState = loadFromStorage();

export const scheduleStore = reactive({
	currentId: initialState.currentId,
	customConfig: initialState.customConfig,
	customJson: initialState.customJson,
	// estado del timer para modos manuales
	timerState: 'stopped', // 'running', 'paused', 'stopped'
	startedAt: null,       // timestamp de inicio
	pausedAt: null,        // timestamp de pausa
	accumulatedMs: 0,      // tiempo acumulado antes de pausa
	// flag para suprimir animación en cambios provocados por el usuario
	userTriggeredChange: false,
});

/**
 * Obtiene la configuración activa.
 * @returns {Object} configuración del schedule activo
 */
export const getActiveSchedule = () => {
	if (scheduleStore.currentId === 'custom' && scheduleStore.customConfig) {
		return scheduleStore.customConfig;
	}
	return SCHEDULE_PRESETS[scheduleStore.currentId] ?? SCHEDULE_PRESETS[DEFAULT_SCHEDULE_ID];
};

/**
 * Inicia el timer manual.
 */
export const startTimer = () => {
	scheduleStore.userTriggeredChange = true;
	scheduleStore.timerState = 'running';
	scheduleStore.startedAt = Date.now();
	scheduleStore.pausedAt = null;
	scheduleStore.accumulatedMs = 0;
};

/**
 * Pausa el timer manual.
 */
export const pauseTimer = () => {
	if (scheduleStore.timerState === 'running') {
		scheduleStore.userTriggeredChange = true;
		scheduleStore.timerState = 'paused';
		scheduleStore.pausedAt = Date.now();
		scheduleStore.accumulatedMs += scheduleStore.pausedAt - scheduleStore.startedAt;
	}
};

/**
 * Reanuda el timer manual.
 */
export const resumeTimer = () => {
	if (scheduleStore.timerState === 'paused') {
		scheduleStore.userTriggeredChange = true;
		scheduleStore.timerState = 'running';
		scheduleStore.startedAt = Date.now();
		scheduleStore.pausedAt = null;
	}
};

/**
 * Detiene el timer manual.
 */
export const stopTimer = () => {
	scheduleStore.userTriggeredChange = true;
	scheduleStore.timerState = 'stopped';
	scheduleStore.startedAt = null;
	scheduleStore.pausedAt = null;
	scheduleStore.accumulatedMs = 0;
};

/**
 * Obtiene el tiempo transcurrido en ms para modos manuales.
 * @returns {number} milisegundos transcurridos
 */
export const getElapsedMs = () => {
	if (scheduleStore.timerState === 'stopped') return 0;
	if (scheduleStore.timerState === 'paused') return scheduleStore.accumulatedMs;
	return scheduleStore.accumulatedMs + (Date.now() - scheduleStore.startedAt);
};

/**
 * Cambia el schedule activo por ID.
 * @param {string} id - ID del schedule
 * @param {boolean} autoStart - iniciar timer automáticamente para modos manuales
 */
export const setScheduleById = (id, autoStart = true) => {
	if (SCHEDULE_PRESETS[id] || id === 'custom') {
		scheduleStore.userTriggeredChange = true;
		scheduleStore.currentId = id;
		localStorage.setItem(STORAGE_KEY, id);

		// auto-iniciar para modos manuales (no okticket)
		const schedule = SCHEDULE_PRESETS[id];
		if (autoStart && schedule && !schedule.useWorkHours) {
			startTimer();
		} else if (schedule?.useWorkHours) {
			stopTimer();
		}
	}
};

/**
 * Configura un schedule personalizado.
 * @param {string} jsonString - configuración JSON
 * @param {boolean} autoStart - iniciar timer automáticamente
 * @returns {{ success: boolean, error?: string }}
 */
export const setCustomSchedule = (jsonString, autoStart = true) => {
	const parsed = parseCustomSchedule(jsonString);
	if (parsed.error) {
		return { success: false, error: parsed.error };
	}

	scheduleStore.userTriggeredChange = true;
	scheduleStore.customConfig = parsed.config;
	scheduleStore.customJson = jsonString;
	scheduleStore.currentId = 'custom';

	localStorage.setItem(CUSTOM_STORAGE_KEY, jsonString);
	localStorage.setItem(STORAGE_KEY, 'custom');

	// auto-iniciar para modos manuales
	if (autoStart && !parsed.config.useWorkHours) {
		startTimer();
	}

	return { success: true };
};
