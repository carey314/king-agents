// ============================================================
// King Agents — Main Entry Point
// ============================================================
// Initializes the Svelte app which in turn creates the Phaser game
// and sets up VS Code communication.

import { mount } from 'svelte';
import App from './App.svelte';

// Mount Svelte app to #app
const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
