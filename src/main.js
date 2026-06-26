import { createApp } from 'vue'
import App from './App.vue'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import 'animate.css'
import { createVuetify } from 'vuetify'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0a0a0f',
          surface: '#12121a',
          primary: '#6c5ce7',
          secondary: '#00cec9',
          accent: '#fd79a8',
          error: '#d63031',
          info: '#0984e3',
          success: '#00b894',
          warning: '#fdcb6e',
        },
      },
    },
  },
})

const app = createApp(App)
app.use(vuetify)
app.mount('#app')
