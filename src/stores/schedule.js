import { reactive } from 'vue';
import { SCHEDULE_PRESETS, DEFAULT_SCHEDULE_ID, parseCustomSchedule } from '../config/schedules.js';

const STORAGE_KEY = 'pomodoro-schedule';
const CUSTOM_STORAGE_KEY = 'pomodoro-custom-schedule';
const NOTIFICATIONS_KEY = 'pomodoro-notifications';

// cargar estado inicial desde localStorage
const loadFromStorage = () => {
	const savedId = localStorage.getItem(STORAGE_KEY);
	const savedCustom = localStorage.getItem(CUSTOM_STORAGE_KEY);
	const savedNotifications = localStorage.getItem(NOTIFICATIONS_KEY);

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
		notificationsEnabled: savedNotifications === 'true',
	};
};

const initialState = loadFromStorage();

// Infinity representa ciclos infinitos
const INFINITE_CYCLES = Infinity;

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
	// notificaciones del navegador
	notificationsEnabled: initialState.notificationsEnabled,
	// ciclos restantes (Infinity = infinito)
	cyclesLeft: INFINITE_CYCLES,
	// ciclo completado actual (para detectar transiciones)
	currentCycleIndex: 0,
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
 * Obtiene el número de ciclos configurados para el schedule activo.
 * @returns {number} número de ciclos (Infinity si no está definido)
 */
export const getConfiguredCycles = () => {
	const schedule = getActiveSchedule();
	// okticket no usa ciclos
	if (schedule.id === 'okticket') return INFINITE_CYCLES;
	return schedule.cycles ?? INFINITE_CYCLES;
};

/**
 * Inicializa los ciclos según la configuración del schedule activo.
 */
export const initializeCycles = () => {
	scheduleStore.cyclesLeft = getConfiguredCycles();
	scheduleStore.currentCycleIndex = 0;
};

/**
 * Establece el número de ciclos manualmente.
 * @param {number|null} cycles - número de ciclos o null para infinito
 */
export const setCycles = (cycles) => {
	scheduleStore.cyclesLeft = cycles ?? INFINITE_CYCLES;
	scheduleStore.currentCycleIndex = 0;
};

/**
 * Decrementa el contador de ciclos.
 * @returns {boolean} true si se agotaron los ciclos
 */
export const decrementCycle = () => {
	if (scheduleStore.cyclesLeft === INFINITE_CYCLES) return false;
	scheduleStore.cyclesLeft = Math.max(0, scheduleStore.cyclesLeft - 1);
	scheduleStore.currentCycleIndex++;
	return scheduleStore.cyclesLeft === 0;
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
	initializeCycles();
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
	scheduleStore.cyclesLeft = INFINITE_CYCLES;
	scheduleStore.currentCycleIndex = 0;
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

/**
 * Habilita las notificaciones del navegador.
 * Solicita permiso si es necesario.
 * @returns {Promise<boolean>} true si se habilitaron correctamente
 */
export const enableNotifications = async () => {
	if (!('Notification' in window)) {
		return false;
	}

	let permission = Notification.permission;
	if (permission === 'default') {
		permission = await Notification.requestPermission();
	}

	if (permission === 'granted') {
		scheduleStore.notificationsEnabled = true;
		localStorage.setItem(NOTIFICATIONS_KEY, 'true');
		return true;
	}

	return false;
};

/**
 * Deshabilita las notificaciones.
 */
export const disableNotifications = () => {
	scheduleStore.notificationsEnabled = false;
	localStorage.setItem(NOTIFICATIONS_KEY, 'false');
};

/**
 * Envía una notificación si están habilitadas.
 * @param {string} oldStatus - estado anterior
 * @param {string} newStatus - estado nuevo
 */
export const sendNotification = (oldStatus, newStatus) => {
	if (!scheduleStore.notificationsEnabled) return;
	if (!('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;

	const hour = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

	new Notification('pomodoro.mier.info', {
		body: `${oldStatus} → ${newStatus} @ ${hour}`,
		icon: `/favicon.svg`,
		tag: 'pomodoro-status',
		renotify: true,
	});
};
