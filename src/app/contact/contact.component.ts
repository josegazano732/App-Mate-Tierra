import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: 'contact.component.html',
  styleUrls: ['contact.component.css']
})
export class ContactComponent {
  contactForm = {
    name: '',
    email: '',
    message: ''
  };

  onSubmit() {
    console.log('Formulario enviado', this.contactForm);
    // Aquí iría la lógica para enviar el formulario
    alert('Mensaje enviado con éxito!');
    this.contactForm = { name: '', email: '', message: '' };
  }
}