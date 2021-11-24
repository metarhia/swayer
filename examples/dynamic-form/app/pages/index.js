import patientService from '../domain/patient-service.js';

/** @returns MetacomponentConfig */
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
  transition: 'background-color 0.2s ease-in-out',
  hover: {
    backgroundColor: 'rebeccapurple',
  },
};

/** @type Metacomponent */
const addFormButton = {
  tag: 'button',
  styles: buttonStyles,
  text: 'Load new form',
  events: {
    async click() {
      const diseaseFormData = await patientService.getDiseaseFormData();
      const diseaseForm = createForm(diseaseFormData);
      this.triggerCustomEvent('addForm', diseaseForm);
    },
  },
};

/** @type Metacomponent */
const removeFormButton = {
  tag: 'button',
  text: 'Remove last form',
  styles: buttonStyles,
  events: {
    click() {
      this.triggerCustomEvent('removeForm');
    },
  },
};

/** @returns Metacomponent */
export default () => ({
  tag: 'html',
  styles: {
    fontFamily: 'Helvetica',
  },
  attrs: {
    lang: 'en',
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
      styles: {
        margin: '0',
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
