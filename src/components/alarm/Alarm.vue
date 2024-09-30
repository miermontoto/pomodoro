<template>
	<div class="alarm-component">
		<div class="alarm-selector">
			<svg class="bell-icon" viewBox="0 0 24 24" width="24" height="24">
				<path
					d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
			</svg>
			<select v-model="selectedSound" @change="updateSound">
				<option value="none">no sound (default)</option>
				<option v-for="sound in sounds" :key="sound.name" :value="sound.file">
					{{ sound.name }}
				</option>
				<option value="custom">custom</option>
			</select>
			<input v-if="selectedSound === 'custom'" type="file" accept="audio/*" @change="handleCustomSound" />
		</div>
	</div>
</template>

<script>
import eventBus from '../../eventBus';

export default {
	name: 'AlarmComponent',
	data() {
		return {
			selectedSound: 'none',
			sounds: [
				{ name: 'bell', file: 'bell.mp3' },
				{ name: 'pollo', file: 'pollo.mp3' },
			],
			audio: new Audio(),
		};
	},
	methods: {
		updateSound() {
			if (this.selectedSound === 'none') {
				this.audio.src = '';
			} else if (this.selectedSound !== 'custom') {
				this.audio.src = `/sounds/${this.selectedSound}`;
			}
			localStorage.setItem('selectedSound', this.selectedSound);
		},
		handleCustomSound(event) {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					this.audio.src = e.target.result;
					localStorage.setItem('customSound', e.target.result);
				};
				reader.readAsDataURL(file);
			}
		},
		playAlarm() {
			if (this.selectedSound !== 'none') {
				this.audio.play();
			}
		},
		loadSavedSound() {
			const savedSound = localStorage.getItem('selectedSound');
			if (savedSound) {
				this.selectedSound = savedSound;
				if (savedSound === 'custom') {
					const customSound = localStorage.getItem('customSound');
					if (customSound) {
						this.audio.src = customSound;
					}
				} else if (savedSound !== 'none') {
					this.audio.src = `/sounds/${savedSound}`;
				}
			}
		},
	},
	mounted() {
		this.loadSavedSound();
		this.$eventBus.on('timerStatusChanged', this.playAlarm);
	},
	beforeUnmount() {
		this.eventBus.$off('timerStatusChanged', this.playAlarm);
	},
};
</script>

<style scoped lang="scss">
@import './Alarm.scss';
</style>
