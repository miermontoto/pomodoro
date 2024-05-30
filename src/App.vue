<script setup>
	import TimerComponent   from './components/timer/Timer.vue';
	import MarqueeComponent from './components/marquee/Marquee.vue';
	import './App.scss';
</script>

<script>
	export default {
		created() {
			document.title = 'OKTpomodoro'
		}
	}
</script>

<template>
	<MarqueeComponent />
	<TimerComponent />

	<div id="footer">
		<a href="https://mier.info">
			<img src="https://mier.info/assets/favicon.svg" id="footer-logo" alt="logo">
		</a>

		<span id="footer-text">
			made with ❤
			for <a href="https://okticket.es"><img src="https://mier.info/assets/icons/exp/okticket.png" width="256" height="256" id="oktlogo" alt="okticket"></a>
			by <a href="https://mier.info">Juan Mier</a>
			in <code>vue.js</code>
		</span>
	</div>
</template>
