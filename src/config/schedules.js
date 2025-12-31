// configuraciones de horarios disponibles
export const SCHEDULE_PRESETS = {
	okticket: {
		id: 'okticket',
		name: 'okticket',
		workMinutes: 50,
		breakMinutes: 10,
		useWorkHours: true,
	},
	'pomodoro-25': {
		id: 'pomodoro-25',
		name: 'pomodoro 25',
		workMinutes: 25,
		breakMinutes: 5,
		useWorkHours: false,
	},
	'pomodoro-50': {
		id: 'pomodoro-50',
		name: 'pomodoro 50',
		workMinutes: 50,
		breakMinutes: 10,
		useWorkHours: false,
	},
};

export const DEFAULT_SCHEDULE_ID = 'okticket';

// mapeo de nombres a índices
const WEEKDAY_NAMES = {
	sunday: 0, sun: 0,
	monday: 1, mon: 1,
	tuesday: 2, tue: 2,
	wednesday: 3, wed: 3,
	thursday: 4, thu: 4,
	friday: 5, fri: 5,
	saturday: 6, sat: 6,
};

const MONTH_NAMES = {
	january: 0, jan: 0,
	february: 1, feb: 1,
	march: 2, mar: 2,
	april: 3, apr: 3,
	may: 4,
	june: 5, jun: 5,
	july: 6, jul: 6,
	august: 7, aug: 7,
	september: 8, sep: 8,
	october: 9, oct: 9,
	november: 10, nov: 10,
	december: 11, dec: 11,
};

/**
 * Valida un rango de horas [inicio, fin].
 */
const isValidHourRange = (range) => {
	return Array.isArray(range) &&
		range.length === 2 &&
		typeof range[0] === 'number' &&
		typeof range[1] === 'number' &&
		range[0] >= 0 && range[0] <= 23 &&
		range[1] >= 1 && range[1] <= 24 &&
		range[0] < range[1];
};

/**
 * Valida un array de rangos de horas.
 */
const isValidHoursArray = (arr) => {
	return Array.isArray(arr) && arr.length > 0 && arr.every(isValidHourRange);
};

/**
 * Comprueba si una clave es un nombre/índice de mes.
 */
const isMonthKey = (key) => {
	const keyLower = key.toLowerCase();
	return keyLower in MONTH_NAMES || /^([0-9]|1[01])$/.test(key);
};

/**
 * Comprueba si una clave es un nombre/índice de día de semana.
 */
const isWeekdayKey = (key) => {
	const keyLower = key.toLowerCase();
	return keyLower in WEEKDAY_NAMES || /^[0-6]$/.test(key);
};

/**
 * Valida la configuración de workHours.
 * Soporta:
 * - Array simple: [[9, 14], [16, 18]]
 * - Objeto con claves por día/mes: { default: [...], friday: [...], july: [...] }
 * - Objeto anidado mes>día: { july: { default: [...], friday: [...] } }
 */
const validateWorkHours = (workHours) => {
	if (!workHours) return { valid: true };

	// formato array simple
	if (Array.isArray(workHours)) {
		if (!isValidHoursArray(workHours)) {
			return { valid: false, error: 'workHours: rangos inválidos, usar [[inicio, fin], ...]' };
		}
		return { valid: true };
	}

	// formato objeto con claves
	if (typeof workHours === 'object') {
		for (const [key, value] of Object.entries(workHours)) {
			const keyLower = key.toLowerCase();

			// validar que la clave sea reconocida
			const isDefault = keyLower === 'default';
			const isWeekday = isWeekdayKey(key);
			const isMonth = isMonthKey(key);

			if (!isDefault && !isWeekday && !isMonth) {
				return { valid: false, error: `workHours: clave "${key}" no reconocida` };
			}

			// si es mes, puede ser array o objeto anidado con días
			if (isMonth && typeof value === 'object' && !Array.isArray(value)) {
				// validar objeto anidado (días dentro del mes)
				for (const [subKey, subValue] of Object.entries(value)) {
					const subKeyLower = subKey.toLowerCase();
					const isSubDefault = subKeyLower === 'default';
					const isSubWeekday = isWeekdayKey(subKey);

					if (!isSubDefault && !isSubWeekday) {
						return { valid: false, error: `workHours["${key}"]["${subKey}"]: solo se permiten días o default` };
					}

					if (!isValidHoursArray(subValue)) {
						return { valid: false, error: `workHours["${key}"]["${subKey}"]: rangos inválidos` };
					}
				}
			} else if (!isValidHoursArray(value)) {
				return { valid: false, error: `workHours["${key}"]: rangos inválidos` };
			}
		}
		return { valid: true };
	}

	return { valid: false, error: 'workHours debe ser un array o un objeto' };
};

/**
 * Obtiene el índice de día de semana de una clave.
 */
const getWeekdayIndex = (key) => {
	const keyLower = key.toLowerCase();
	return WEEKDAY_NAMES[keyLower] ?? ((/^[0-6]$/.test(key)) ? parseInt(key) : null);
};

/**
 * Obtiene el índice de mes de una clave.
 */
const getMonthIndex = (key) => {
	const keyLower = key.toLowerCase();
	return MONTH_NAMES[keyLower] ?? ((/^([0-9]|1[01])$/.test(key)) ? parseInt(key) : null);
};

/**
 * Resuelve horas desde un objeto buscando por día de semana.
 */
const resolveWeekdayHours = (obj, dayOfWeek) => {
	for (const [key, value] of Object.entries(obj)) {
		const weekdayIndex = getWeekdayIndex(key);
		if (weekdayIndex !== null && weekdayIndex === dayOfWeek) {
			return value;
		}
	}
	return obj.default ?? null;
};

/**
 * Resuelve las horas de trabajo para una fecha dada.
 * Prioridad: mes (con día anidado) > mes > día de semana > default
 *
 * @param {Object} workHours - configuración de workHours
 * @param {Date} date - fecha para resolver
 * @returns {Array|null} - array de rangos [[inicio, fin], ...] o null
 */
export const resolveWorkHours = (workHours, date) => {
	if (!workHours) return null;

	// formato array simple: mismo horario todos los días
	if (Array.isArray(workHours)) {
		return workHours;
	}

	const dayOfWeek = date.getDay();
	const month = date.getMonth();

	// buscar por mes (prioridad alta)
	for (const [key, value] of Object.entries(workHours)) {
		const monthIndex = getMonthIndex(key);
		if (monthIndex !== null && monthIndex === month) {
			// si el valor es un objeto (no array), buscar día dentro del mes
			if (typeof value === 'object' && !Array.isArray(value)) {
				return resolveWeekdayHours(value, dayOfWeek);
			}
			return value;
		}
	}

	// buscar por día de semana (a nivel raíz)
	const weekdayResult = resolveWeekdayHours(workHours, dayOfWeek);
	if (weekdayResult && Array.isArray(weekdayResult)) {
		return weekdayResult;
	}

	// usar default
	return workHours.default ?? null;
};

/**
 * Valida un objeto de configuración de horario personalizado.
 * @param {Object} config - configuración a validar
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateCustomSchedule = (config) => {
	if (!config || typeof config !== 'object') {
		return { valid: false, error: 'debe ser un objeto JSON válido' };
	}

	const { workMinutes, breakMinutes, workHours } = config;

	if (typeof workMinutes !== 'number' || workMinutes < 1 || workMinutes > 120) {
		return { valid: false, error: 'workMinutes debe ser un número entre 1 y 120' };
	}

	if (typeof breakMinutes !== 'number' || breakMinutes < 1 || breakMinutes > 60) {
		return { valid: false, error: 'breakMinutes debe ser un número entre 1 y 60' };
	}

	// validar workHours si está presente
	const workHoursValidation = validateWorkHours(workHours);
	if (!workHoursValidation.valid) {
		return workHoursValidation;
	}

	return { valid: true };
};

/**
 * Parsea y valida una configuración personalizada desde JSON string.
 * @param {string} jsonString - configuración en formato JSON
 * @returns {{ config?: Object, error?: string }}
 */
export const parseCustomSchedule = (jsonString) => {
	try {
		const config = JSON.parse(jsonString);
		const validation = validateCustomSchedule(config);
		if (!validation.valid) {
			return { error: validation.error };
		}

		// useWorkHours es automático: true si workHours está definido
		const hasWorkHours = config.workHours !== undefined && config.workHours !== null;

		return {
			config: {
				id: 'custom',
				name: 'custom',
				workMinutes: config.workMinutes,
				breakMinutes: config.breakMinutes,
				useWorkHours: hasWorkHours,
				workHours: config.workHours ?? null,
			}
		};
	} catch (e) {
		return { error: 'JSON inválido' };
	}
};

/**
 * Obtiene un preset por su ID.
 * @param {string} id - ID del preset
 * @returns {Object|null}
 */
export const getScheduleById = (id) => {
	return SCHEDULE_PRESETS[id] ?? null;
};
