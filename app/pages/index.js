import patientService from '../domain/patient-service.js';

const buttonStyles = {
  padding: '5px 10px',
  margin: '20px',
  borderRadius: '5px',
  backgroundColor: 'purple',
  border: 'none',
  color: 'white',
  cursor: 'pointer'
};

const addFormButton = {
  tag: 'button',
  styles: buttonStyles,
  text: 'Load new form',
  events: {
    async click() {
      const diseaseFormData = await patientService.getDiseaseFormData();
      const diseaseForm = createForm(diseaseFormData);
      this.parent.children.push(diseaseForm);
    }
  }
};

const removeFormButton = {
  tag: 'button',
  styles: {
    ...buttonStyles,
    marginLeft: '20px'
  },
  text: 'Remove last form',
  events: {
    click() {
      const { children } = this.parent;
      const last = children[children.length - 1];
      if (this !== last) children.pop();
    }
  }
};

const createForm = (data) => ({
  type: 'preload',
  name: 'Form',
  props: data
});

export default () => ({
  tag: 'html',
  styles: {
    fontFamily: 'Helvetica'
  },
  attrs: {
    lang: 'en'
  },
  hooks: {
    init() {
      console.log('Html init');
    }
  },
  children: [
    { type: 'preload', name: 'Head' },
    {
      tag: 'body',
      styles: {
        margin: 0
      },
      asyncIterable: true,
      hooks: {
        async init() {
          console.log('Body init');
          const registrationFormData = await patientService.getRegistrationFormData();
          const registrationForm = createForm(registrationFormData);
          this.children.push(
            registrationForm,
            addFormButton,
            removeFormButton
          );
        }
      }
    }
  ]
});
