import patientService from '../domain/patient-service.js';

/** @returns SchemaConfig */
const createForm = (data) => ({
  path: '../features/form/form',
  base: import.meta.url,
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

/** @type Schema */
const addFormButton = {
  tag: 'button',
  styles: buttonStyles,
  text: 'Load new form',
  events: {
    async click() {
      const diseaseFormData = await patientService.getDiseaseFormData();
      const diseaseForm = createForm(diseaseFormData);
      this.emitCustomEvent('addForm', diseaseForm);
    },
  },
};

/** @type Schema */
const removeFormButton = {
  tag: 'button',
  text: 'Remove last form',
  styles: buttonStyles,
  events: {
    click() {
      this.emitCustomEvent('removeForm');
    },
  },
};

/** @returns Schema */
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
        addForm({ detail: diseaseForm }) {
          this.children.push(diseaseForm);
        },
        removeForm() {
          const children = this.children;
          const last = children[children.length - 1];
          if (removeFormButton !== last.original) children.pop();
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
    //   path: '../features/form/form',
    //   base: import.meta.url,
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
