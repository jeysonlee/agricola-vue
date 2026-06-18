import { ref, computed } from 'vue'
import { Geolocation } from '@capacitor/geolocation'

const BASE    = 'https://api.openweathermap.org/data/4.0/onecall'
const GEO_URL = 'https://api.openweathermap.org/geo/1.0'

const isNative = () => typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

/**
 * Genera el aviso agrícola estructurado para un día del pronóstico.
 * @param {object} dia  - Objeto de día de la API (daily o current)
 * @returns {{ tipo, emoji, color, urgente, titulo, resumen, buenoPara, maloPara }}
 */
export function generarAvisoDia(dia) {
  if (!dia) return null

  const id     = dia.weather?.[0]?.id ?? 800
  const pop    = dia.pop ?? 0
  const tMax   = dia.temp?.max ?? (typeof dia.temp === 'number' ? dia.temp : 30)
  const tMin   = dia.temp?.min ?? (typeof dia.temp === 'number' ? dia.temp : 15)
  const viento = dia.wind_speed ?? 0

  // Tormenta eléctrica
  if (id >= 200 && id < 300) return {
    tipo: 'tormenta', emoji: '⛈️', color: 'danger', urgente: true,
    titulo:    `Tormenta eléctrica · ${Math.round(pop * 100)}% lluvia`,
    resumen:   'No trabaje en campo abierto. Riesgo para operadores y maquinaria.',
    buenoPara: ['Mantenimiento bajo techo', 'Planificación y registros'],
    maloPara:  ['Cualquier labor a campo abierto', 'Maquinaria', 'Fumigación'],
  }

  // Llovizna
  if (id >= 300 && id < 400) return {
    tipo: 'llovizna', emoji: '🌦️', color: 'warning', urgente: pop > 0.5,
    titulo:    `Llovizna · ${Math.round(pop * 100)}% · ${Math.round(tMax)}°C`,
    resumen:   'Lloviznas ligeras. Evite aplicar agroquímicos.',
    buenoPara: ['Trasplante', 'Siembra en suelo húmedo'],
    maloPara:  ['Fumigación', 'Cosecha mecanizada'],
  }

  // Lluvia
  if (id >= 500 && id < 600) return {
    tipo: 'lluvia', emoji: '🌧️', color: pop > 0.6 ? 'danger' : 'warning', urgente: pop > 0.4,
    titulo:    `Lluvia · ${Math.round(pop * 100)}% · ${Math.round(tMax)}°C`,
    resumen:   'Suspenda fumigaciones y aplicación de productos. Las lluvias los diluirán.',
    buenoPara: ['Riego natural', 'Mantenimiento de equipos bajo techo'],
    maloPara:  ['Agroquímicos y pesticidas', 'Cosecha mecanizada'],
  }

  // Helada / nieve
  if (id >= 600 && id < 700) return {
    tipo: 'helada', emoji: '❄️', color: 'danger', urgente: true,
    titulo:    `Riesgo de helada · mín ${Math.round(tMin)}°C`,
    resumen:   'Cubra cultivos sensibles. Evite trasplante de plántulas.',
    buenoPara: ['Poda de reposo vegetativo'],
    maloPara:  ['Trasplante', 'Siembra', 'Cosecha de frutos'],
  }

  // Niebla
  if (id >= 700 && id < 800) return {
    tipo: 'neblina', emoji: '🌫️', color: 'medium', urgente: false,
    titulo:    `Neblina · ${Math.round(tMax)}°C`,
    resumen:   'Alta humedad relativa. Favorece hongos y enfermedades foliares.',
    buenoPara: ['Siembra', 'Riego moderado'],
    maloPara:  ['Fumigación aérea', 'Secado post-cosecha'],
  }

  // Despejado
  if (id === 800) {
    if (tMax > 35) return {
      tipo: 'calor', emoji: '🌡️', color: 'warning', urgente: true,
      titulo:    `Calor extremo · ${Math.round(tMax)}°C`,
      resumen:   'Temperatura peligrosa. Trabaje solo en las primeras horas de la mañana.',
      buenoPara: ['Labores antes de las 10am', 'Riego nocturno o al amanecer'],
      maloPara:  ['Trabajo entre 11am-16h', 'Trasplante al mediodía'],
    }
    if (tMin < 5) return {
      tipo: 'frio', emoji: '🥶', color: 'warning', urgente: true,
      titulo:    `Frío intenso · mín ${Math.round(tMin)}°C`,
      resumen:   'Riesgo de daño por frío en cultivos sensibles.',
      buenoPara: ['Poda', 'Mantenimiento de infraestructura'],
      maloPara:  ['Trasplante de plántulas', 'Riego nocturno'],
    }
    return {
      tipo: 'soleado', emoji: '☀️', color: 'success', urgente: false,
      titulo:    viento > 8 ? `Soleado con viento · ${Math.round(tMax)}°C` : `Soleado · ${Math.round(tMax)}°C`,
      resumen:   viento > 8
        ? 'Buen día pero viento fuerte. Evite aplicar pesticidas; el viento los derivará.'
        : 'Excelente para todas las labores de campo.',
      buenoPara: viento > 8
        ? ['Cosecha', 'Siembra', 'Trasplante']
        : ['Fumigación', 'Cosecha', 'Siembra', 'Trasplante', 'Agroquímicos'],
      maloPara: viento > 8 ? ['Pesticidas y herbicidas'] : [],
    }
  }

  // Nublado parcial / total
  const pocoNublado = id <= 802
  return {
    tipo: 'nublado', emoji: pocoNublado ? '🌤️' : '☁️', color: pop > 0.35 ? 'warning' : 'medium', urgente: false,
    titulo:    `Nublado · ${Math.round(tMax)}°C`,
    resumen:   pop > 0.35
      ? 'Posible lluvia. Tenga presente antes de aplicar productos.'
      : 'Día fresco y nublado. Buenas condiciones para trasplante y siembra.',
    buenoPara: ['Trasplante', 'Siembra', 'Labores generales'],
    maloPara:  pop > 0.35 ? ['Fumigación', 'Cosecha mecanizada'] : [],
  }
}

export function condicionEmoji(id) {
  if (!id) return '🌡️'
  if (id >= 200 && id < 300) return '⛈️'
  if (id >= 300 && id < 400) return '🌦️'
  if (id >= 500 && id < 600) return '🌧️'
  if (id >= 600 && id < 700) return '❄️'
  if (id >= 700 && id < 800) return '🌫️'
  if (id === 800)             return '☀️'
  if (id === 801 || id === 802) return '🌤️'
  return '☁️'
}

async function apiFetch(url) {
  const resp = await fetch(url)
  const body = await resp.json()
  if (!resp.ok) throw new Error(body.message || `Error ${resp.status}`)
  return body
}

export function useClima() {
  const loading          = ref(false)
  const loadingBusqueda  = ref(false)
  const error            = ref(null)
  const actual           = ref(null)
  const pronostico       = ref([])
  const horas            = ref([])
  const alertas          = ref([])
  const ubicacion        = ref(null)
  const resultadosCiudad = ref([])   // lista de ciudades sugeridas al buscar

  const horasCortas = computed(() => horas.value.slice(0, 24))

  // ── Geolocalización GPS ───────────────────────────────────────────────────────
  async function obtenerCoordenadas() {
    if (isNative()) {
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted') await Geolocation.requestPermissions()
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      return { lat: pos.coords.latitude, lon: pos.coords.longitude }
    }

    // Web: usa navigator.geolocation directamente (Capacitor no lo implementa en web)
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tu navegador no soporta geolocalización.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(new Error(mensajeErrorGeo(err.code))),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300_000 }
      )
    })
  }

  function mensajeErrorGeo(code) {
    const msgs = {
      1: 'Permiso de ubicación denegado.',
      2: 'No se pudo detectar la ubicación.',
      3: 'Tiempo de espera agotado.',
    }
    return msgs[code] || 'Error al obtener la ubicación.'
  }

  // ── Buscar ciudades por nombre (Geocoding API) ────────────────────────────────
  async function buscarCiudades(query) {
    resultadosCiudad.value = []
    if (!query || query.trim().length < 2) return

    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
    if (!apiKey) return

    loadingBusqueda.value = true
    try {
      const data = await apiFetch(
        `${GEO_URL}/direct?q=${encodeURIComponent(query.trim())}&limit=5&appid=${apiKey}`
      )
      resultadosCiudad.value = data.map(c => ({
        nombre:  c.local_names?.es ?? c.name,
        pais:    c.country,
        estado:  c.state ?? '',
        lat:     c.lat,
        lon:     c.lon,
        label:   [c.local_names?.es ?? c.name, c.state, c.country].filter(Boolean).join(', '),
      }))
    } catch {
      resultadosCiudad.value = []
    } finally {
      loadingBusqueda.value = false
    }
  }

  // ── Cargar datos del clima dado lat/lon ───────────────────────────────────────
  async function cargarConCoordenadas(lat, lon, ciudad) {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
    if (!apiKey) {
      error.value = 'Falta VITE_OPENWEATHER_API_KEY en el archivo .env.local'
      return
    }

    ubicacion.value = { lat, lon, ciudad }
    const params    = `lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`

    const [currentRes, hourlyRes, dailyRes] = await Promise.all([
      apiFetch(`${BASE}/current?${params}`),
      apiFetch(`${BASE}/timeline/1h?${params}`),
      apiFetch(`${BASE}/timeline/1day?${params}`),
    ])

    actual.value     = currentRes.data?.[0] ?? null
    horas.value      = hourlyRes.data ?? []
    pronostico.value = (dailyRes.data ?? []).slice(0, 7)

    const alertUuids = actual.value?.alerts ?? []
    if (alertUuids.length) {
      const detalles = await Promise.all(
        alertUuids.slice(0, 3).map(uuid =>
          apiFetch(`${BASE}/alert/${uuid}?appid=${apiKey}`).catch(() => null)
        )
      )
      alertas.value = detalles.filter(Boolean)
    } else {
      alertas.value = []
    }
  }

  // ── Carga con GPS automático ──────────────────────────────────────────────────
  async function cargarClima() {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
    if (!apiKey) {
      error.value = 'Falta VITE_OPENWEATHER_API_KEY en el archivo .env.local'
      return
    }

    loading.value = true
    error.value   = null
    try {
      const coords = await obtenerCoordenadas()
      // Nombre de ciudad por geocodificación inversa
      let ciudad = 'Mi ubicación'
      try {
        const geo = await apiFetch(`${GEO_URL}/reverse?lat=${coords.lat}&lon=${coords.lon}&limit=1&appid=${apiKey}`)
        ciudad = geo[0]?.local_names?.es ?? geo[0]?.name ?? 'Mi ubicación'
      } catch { /* no crítico */ }

      await cargarConCoordenadas(coords.lat, coords.lon, ciudad)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // ── Carga desde ciudad seleccionada en el buscador ───────────────────────────
  async function seleccionarCiudad(ciudad) {
    loading.value          = true
    error.value            = null
    resultadosCiudad.value = []
    try {
      await cargarConCoordenadas(ciudad.lat, ciudad.lon, ciudad.nombre)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // ── Sugerencias agrícolas ────────────────────────────────────────────────────
  function generarSugerencias(current, daily = []) {
    if (!current) return []
    const sugerencias  = []
    const manana       = daily[1] ?? daily[0] ?? {}
    const condId       = current.weather?.[0]?.main ?? ''
    const lloviendo    = ['Rain', 'Drizzle', 'Thunderstorm'].includes(condId)
    const lluviaMañana = (manana.pop ?? 0) > 0.6
    const temp         = current.temp ?? 0
    const humedad      = current.humidity ?? 0
    const viento       = current.wind_speed ?? 0
    const uvi          = current.uvi ?? 0

    if (lloviendo) {
      sugerencias.push({
        color: 'warning', icon: 'rainy-outline',
        titulo: 'Lluvia en curso',
        texto:  'Suspenda riegos y no aplique agroquímicos. El agua los diluirá.',
      })
    }
    if (!lloviendo && lluviaMañana) {
      sugerencias.push({
        color: 'warning', icon: 'umbrella-outline',
        titulo: `${Math.round((manana.pop ?? 0) * 100)}% de lluvia mañana`,
        texto:  'Adelante o posponga las aplicaciones de fitosanitarios.',
      })
    }
    if (temp > 35) {
      sugerencias.push({
        color: 'danger', icon: 'thermometer-outline',
        titulo: 'Temperatura extrema',
        texto:  'Aumente la frecuencia de riego. Evite labores entre las 11:00 y las 16:00.',
      })
    }
    if (temp < 5) {
      sugerencias.push({
        color: 'danger', icon: 'snow-outline',
        titulo: 'Riesgo de helada',
        texto:  'Cubra cultivos sensibles. Evite trasplante de plántulas.',
      })
    }
    if (viento > 8) {
      sugerencias.push({
        color: 'warning', icon: 'thunderstorm-outline',
        titulo: `Vientos fuertes (${Math.round(viento)} m/s)`,
        texto:  'No aplique pesticidas ni herbicidas; el viento los derivará.',
      })
    }
    if (humedad > 85 && temp > 20) {
      sugerencias.push({
        color: 'warning', icon: 'water-outline',
        titulo: 'Alta humedad relativa',
        texto:  'Riesgo de hongos y bacterias. Considere fungicida preventivo.',
      })
    }
    if (uvi > 8) {
      sugerencias.push({
        color: 'warning', icon: 'sunny-outline',
        titulo: `Índice UV muy alto (${uvi})`,
        texto:  'Trabaje temprano o al atardecer. Use protección solar.',
      })
    }
    if (!lloviendo && !lluviaMañana && temp >= 15 && temp <= 30 && viento < 5 && humedad < 80) {
      sugerencias.push({
        color: 'success', icon: 'checkmark-circle-outline',
        titulo: 'Condiciones ideales para el campo',
        texto:  'Buen momento para cosecha, siembra, trasplante y aplicación de agroquímicos.',
      })
    }
    return sugerencias
  }

  return {
    loading, loadingBusqueda, error,
    actual, pronostico, horas, alertas, ubicacion, horasCortas,
    resultadosCiudad,
    cargarClima, seleccionarCiudad, buscarCiudades, generarSugerencias,
  }
}
