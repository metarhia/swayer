import patientService from '../domain/patient-service.js';

const createForm = (data) => ({
  path: '/app/features/form/form',
  args: data,
});

const buttonStyles = {
  padding: '5px 10px',
  margin: '20px',
  borderRadius: '5px',
  backgroundColor: 'purple',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
};

const addFormButton = {
  tag: 'button',
  attrs: {
    style: buttonStyles,
  },
  text: 'Load new form',
  events: {
    async click() {
      const diseaseFormData = await patientService.getDiseaseFormData();
      const diseaseForm = createForm(diseaseFormData);
      this.triggerCustomEvent('addForm', diseaseForm);
    },
  },
};

const removeFormButton = {
  tag: 'button',
  text: 'Remove last form',
  attrs: {
    style: {
      ...buttonStyles,
      marginLeft: '20px',
    },
  },
  events: {
    click() {
      this.triggerCustomEvent('removeForm');
    },
  },
};

export default async () => ({
  tag: 'html',
  attrs: {
    lang: 'en',
    style: {
      fontFamily: 'Helvetica',
    },
  },
  hooks: {
    init() {
      console.log('Html init');
    },
  },
  children: [
    { path: './head', base: import.meta.url },
    {
      tag: 'body',
      attrs: {
        style: {
          margin: 0,
        },
      },
      events: {
        addForm(diseaseForm) {
          this.children.push(diseaseForm);
        },
        removeForm() {
          const children = this.children;
          const last = children[children.length - 1];
          if (removeFormButton !== last) children.pop();
        },
      },
      hooks: {
        async init() {
          const registerFormData = await patientService.getRegisterFormData();
          const registerForm = createForm(registerFormData);
          this.children.push(registerForm, addFormButton, removeFormButton);
        },
      },
    },
    // uncomment to test performance
    // ...new Array(1000).fill({
    //   path: '/app/features/form/form',
    //   args: {
    //     action: 'addPatientDisease',
    //     title: 'Disease form',
    //     fields: {
    //       disease: {
    //         type: 'text',
    //         placeholder: 'Name',
    //       },
    //       symptom: {
    //         type: 'select',
    //         options: [
    //           { text: 'Sore throat', value: 'soreThroat' },
    //           { text: 'Stomach ache', value: 'stomachAche' },
    //           { text: 'Tooth pain', value: 'toothPain' },
    //         ],
    //       },
    //     },
    //   },
    // }),
  ],
});
