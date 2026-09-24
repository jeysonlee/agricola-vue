import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import TicketForm from '@/views/tickets/TicketForm.vue'

describe('TicketForm.vue', () => {
  test('muestra el formulario para crear un nuevo ticket', () => {
    const wrapper = mount(TicketForm, {
      props: {
        sale: null,
      },
    })

    expect(wrapper.text()).toContain('Nuevo ticket')
    expect(wrapper.text()).toContain('Nombre completo')
  })
})
