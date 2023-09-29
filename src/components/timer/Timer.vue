<template>
	<div id="timer" class="bar">
		<span id="icon">{{ diff.icon }}</span>
		<span id="countdown" :class="diff.status">{{ diff.string ? diff.string : '...' }}</span>
		<br>
	</div>
	<div class="bar">
		<span id="info">
			<span id="started">
				<span class="info-left">Started:</span>
				<span class="info-right" :class="diff.startStyle">{{ diff.start }}</span>
			</span>
			<br>
			<span id="next">
				<span class="info-left">Next:</span>
				<span class="info-right">{{ formatDate(diff.target) }}</span>
			</span>
		</span>
	</div>
</template>

<script>
import '@/components/timer/Timer.scss';

const getDateDiff = (arr) => {
	let now = new Date();
	let target = arr[0];
	let status = arr[1];
	let start = arr[2];

	let diff = new Date(target.getTime() - now.getTime());
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
		target: target,
		status: status,
		start: start,
		startStyle: start === '...' ? 'stop' : '',
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
			if (date.getDay() === 5) return [8, 15]; // Viernes de 8 a 15
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

			// Si no está en horario, buscar el próximo inicio
			if (!this.inSchedule(d)) return [this.nextStart(), 'stop', this.formatDate(NaN)];

			let lastStart = this.lastStart();
			let target = new Date(d);

			// Reglas generales
			target.setMilliseconds(0); // ignorar ms para evitar errores de redondeo
			target.setSeconds(0);

			target.setMinutes(d.getMinutes() >= 50 ? 0 : 50);
			target.setHours(d.getMinutes() >= 50 ? d.getHours() + 1 : d.getHours());
			let status = d.getMinutes() >= 50 ? 'pause' : 'work';

			if (d.getDay() === 5 && ((d.getHours() === 10 && d.getMinutes() >= 45) || d.getHours() === 11)) { // tener en cuenta los jiras!
				target.setMinutes(45); // Jira a las 10:45

				if (d.getMinutes() >= 45 || d.getHours() === 11) { // En descanso de Jira
					target.setMinutes(0);
					target.setHours(12);
					status = 'jira';
				}
			} else if ((d.getHours() === 11 && d.getMinutes() < 30) || (d.getHours() === 10 && d.getMinutes() >= 50)) { // tener en cuenta el descanso del café!
				target.setMinutes(30);
				target.setHours(11); // hasta las 11:30
				status = 'coffee';
			} else if (d.getHours() === 11) {
				target.setMinutes(d.getMinutes() < 55 ? 55 : 0);
				target.setHours(target.getMinutes() === 0 ? 12 : 11);
				status = d.getMinutes() <= 55 ? 'work' : 'pause';
			}

			return [target, status, lastStart];
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
		lastStart() {
			let d = new Date();
			let target = new Date(d);
			target.setMilliseconds(0);
			target.setSeconds(0);

			if(!this.inSchedule(d)) { // Si no está en horario, buscar el último inicio
				target.setMinutes(0);
				let todaysSchedule = this.getSchedule(d);
				let yesterdaysSchedule = this.getSchedule(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));

				if (d.getHours() < todaysSchedule[0]) {
					target.setDate(d.getDate() - 1);
					target.setHours(yesterdaysSchedule[1]);
					return this.formatDate(target);
				} else {
					target.setHours(todaysSchedule[1]);
					return this.formatDate(target);
				}
			}

			target.setMinutes(d.getMinutes() >= 50 ? 50 : 0);

			if (d.getDay() === 5 && (d.getHours() === 11 || (d.getHours() === 10 && d.getMinutes() >= 45))) {
				target.setHours(10);
				target.setMinutes(45);
			} else if(d.getHours() === 11 || (d.getHours() === 10 && d.getMinutes() >= 50)) {
				target.setHours(10);
				target.setMinutes(50);
			}

			return this.formatDate(target);
		},
		getDiff() {
			let arr = this.getStatus();
			this.diff = getDateDiff(arr);
		},
		formatDate(date) {
			let s = "";
			let d = new Date(date);
			let now = new Date();

			if (isNaN(d.getTime())) return "..."; // if there is no time, the page is still loading

			if (d.getDate() !== now.getDate()) {
				if (d.getDate() === now.getDate() + 1) s += "mañana, ";
				else if (d.getDate() === now.getDate() - 1) s += "ayer, ";
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
