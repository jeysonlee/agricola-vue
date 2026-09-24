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

  test('bloquea el envío cuando el nombre, DNI o teléfono son inválidos', async () => {
    const wrapper = mount(TicketForm, {
      props: {
        sale: null,
      },
    })

    await wrapper.findAll('input')[0].setValue('A')
    await wrapper.findAll('input')[1].setValue('1234')
    await wrapper.findAll('input')[2].setValue('12')
    await wrapper.findAll('input')[3].setValue('50')

    expect(wrapper.text()).toContain('Ingrese un nombre válido')
    expect(wrapper.text()).toContain('El DNI debe tener 8 dígitos')
    expect(wrapper.text()).toContain('El teléfono debe tener 9 dígitos')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
