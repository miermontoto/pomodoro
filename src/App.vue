<script setup>
import './App.scss';
import MarqueeComponent from './components/marquee/Marquee.vue';
import SettingsComponent from './components/settings/Settings.vue';
import TimerComponent from './components/timer/Timer.vue';
</script>

<template>
	<MarqueeComponent />
	<TimerComponent />
	<SettingsComponent class="settings" />

	<div id="footer">
		<a href="https://mier.info">
			<img type="image/svg" src="/favicon.svg" id="footer-logo" alt="logo">
		</a>

		<span id="footer-text">
			made with ❤
			for <a href="https://okticket.es"><img src="https://mier.info/assets/icons/exp/okticket.png" width="256"
					height="256" id="oktlogo" alt="okticket"></a>
			by <a href="https://mier.info">Juan Mier</a>
			in <code>vue.js</code>
		</span>
	</div>
</template>

<style lang="scss">
.settings {
	position: fixed;
	top: 10px;
	right: 10px;
}
</style>
