<template>
	<div id="timer" class="bar">
		<span id="icon">{{ diff.icon }}</span>
		<span id="countdown" :class="diff.status">{{ diff.string ? diff.string : '...' }}</span>
		<br>
	</div>
	<div id="info" class="bar">
		<span id="next">Next: {{ formatDate(diff.target) }}</span>
	</div>
</template>

<script>
import '@/components/Timer.scss';

const getDateDiff = (date1, date2, status) => {
	let diff = new Date(date2.getTime() - date1.getTime());
	let hours = (diff.getHours() - 1) + (diff.getDate() - 1) * 24;
	let minutes = diff.getMinutes();
	let seconds = diff.getSeconds();
	let items = hours === 0 ? [minutes, seconds] : [hours, minutes, seconds];
	let icon;
	switch(status) {
		case 'work':
			icon = '🍅';
			break;
		case 'stop':
			icon = '🛑';
			break;
		case 'coffee':
			icon = '☕';
			break;
		case 'jira':
			icon = '📝';
			break;
		case 'questions':
			icon = '❔';
			break;
		case 'pause':
			icon = '⏸️';
			break;
		default:
			icon = '';
			break;
	}
	return {
		string: items.map((x) => x.toString().padStart(2, '0')).join(':'),
		icon: icon,
		target: date2,
		status: status,
	}
};

export default {
	name: 'TimerComponent',
	components: {},
	data() {
		return {
			diff: {},
			timer: undefined,
		};
	},
	methods: {
		/**
		 * Devolver el horario de trabajo dependiendo del mes.
		 * Se considera que el horario de verano es de junio a septiembre.
		 * @param {*} date Fecha del horario a devolver
		 * @returns Array con el inicio y fin del horario
		 */
		getSchedule(date) {
			return date.getMonth() < 8 && date.getMonth() > 5 ? [8, 15] : [9, 14];
		},
		/**
		 * Devolver si la fecha está dentro del horario de trabajo.
		 * @param {*} date Fecha a comprobar
		 * @returns true si está en horario, false si no
		 */
		inSchedule(date) {
			let schedule = this.getSchedule(date);
			return date.getHours() >= schedule[0] && date.getHours() < schedule[1];
		},
		/**
		 * Calcular el próximo fin de pomodoro.
		 * Si no está en horario, devolver el próximo inicio de la jornada mediante nextStart().
		 * @returns Fecha del próximo fin de pomodoro
		 */
		getStatus() {
			let d = new Date();
			if (!this.inSchedule(d)) return [this.nextStart(), 'stop']; // Si no está en horario, buscar el próximo inicio

			let target = new Date(d);

			// Reglas generales
			target.setMilliseconds(0); // ignorar ms para evitar errores de redondeo
			target.setSeconds(0);
			target.setMinutes(d.getMinutes() >= 50 ? 0 : 50);
			target.setHours(d.getMinutes() >= 50 ? d.getHours() + 1 : d.getHours());
			let status = d.getMinutes() >= 50 ? 'pause' : 'work';

			if (d.getDay() === 5 && d.getHours() === 10) { // tener en cuenta los jiras!
				target.setMinutes(45); // Jira a las 10:45

				if (d.getMinutes() >= 45) { // En descanso de Jira
					target.setMinutes(0);
					target.setHours(12);
					status = 'jira';
				}
			} else if (d.getHours() === 11 || (d.getHours() === 10 && d.getMinutes() >= 50)) { // tener en cuenta el descanso del café!
				target.setMinutes(0);
				target.setHours(12); // hasta las 12:00
				status = 'coffee';
			}

			return [target, status];
		},
		/**
		 * Calcular el próximo inicio de jornada.
		 * Si hoy todavía no empezó, devolver el inicio de hoy.
		 * @returns Fecha del próximo inicio de jornada
		 */
		nextStart() {
			let d = new Date();

			// Si hoy todavía no empezó, devolver el inicio de hoy
			if(this.getSchedule(d)[0] > d.getHours()) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), this.getSchedule(d)[0], 0);

			let newDay;
			let newMonth = d.getMonth();
			let newYear = d.getFullYear();

			// Devolver el inicio del próximo día hábil (no se tienen en cuenta fiestas)
			if (d.getDay() === 5) newDay = d.getDate() + 3;
			else if (d.getDay() === 6) newDay = d.getDate() + 2;
			else newDay = d.getDate() + 1;

			if (newDay > new Date(d.getFullYear(), d.getMonth(), 0).getDate()) {
				newDay = 1;
				newMonth += 1;
			}

			if (newMonth > 11) {
				newMonth = 0;
				newYear += 1;
			}

			let targetDate = new Date(newYear, newMonth, newDay);
			return new Date(newYear, newMonth, newDay, this.getSchedule(targetDate)[0], 0);
		},
		getDiff() {
			let arr = this.getStatus();
			this.diff = getDateDiff(new Date(), arr[0], arr[1]);
		},
		formatDate(date) {
			let s = "";
			let d = new Date(date);
			let now = new Date();

			if (isNaN(d.getTime())) return "Loading..."; // if there is no time, the page is still loading

			if (d.getDate() !== now.getDate()) {
				if (d.getDate() === now.getDate() + 1) s += "mañana, ";
				else s += d.toLocaleDateString('es-ES', {weekday: 'long'}) + ", ";
			}
			s += d.toTimeString().split(":00 ")[0];

			return s;
		},
	},
	beforeMount() {
		this.timer = setInterval(this.getDiff, 1000);
		this.getDiff();
	},
	beforeUnmount() {
		clearInterval(this.timer);
	},
};
</script>
