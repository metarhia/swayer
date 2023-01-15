import patientService from './patient-service.js';

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

/** @type {Schema} */
const addFormButton = {
  tag: 'button',
  styles: buttonStyles,
  text: 'Load new form',
  attrs: {
    type: 'button',
  },
  events: {
    async click() {
      const diseaseFormData = await patientService.getDiseaseFormData();
      this.model.addForm(diseaseFormData);
    },
  },
};

/** @type {Schema} */
const removeFormButton = {
  tag: 'button',
  text: 'Remove last form',
  styles: buttonStyles,
  attrs: {
    type: 'button',
  },
  events: {
    click() {
      this.model.popForm();
    },
  },
};

class FormsSchemaModel {
  state = {
    forms: [
      {
        action: 'addPatientDisease',
        title: 'Disease form',
        fields: {
          disease: {
            type: 'text',
            defaultValue: '',
            placeholder: 'Name',
          },
          symptom: {
            type: 'select',
            defaultValue: 'soreThroat',
            options: [
              { text: 'Sore throat', value: 'soreThroat' },
              { text: 'Stomach ache', value: 'stomachAche' },
              { text: 'Tooth pain', value: 'toothPain' },
            ],
          },
        },
      },
    ],
  };

  addForm(data) {
    this.state.forms.push(data);
  }

  popForm() {
    this.state.forms.pop();
  }
}

/** @returns {Schema} */
export default () => ({
  tag: 'html',
  styles: {
    fontFamily: 'Helvetica',
  },
  model: new FormsSchemaModel(),
  attrs: {
    lang: 'en',
  },
  children: [
    { path: '@site/head.component' },
    {
      tag: 'body',
      styles: {
        margin: '0',
      },
      children: [
        ({ forms }) => forms.map((form) => ({
          path: '@form/form',
          input: form,
        })),
        addFormButton,
        ({ forms }) => (forms.length > 0) && removeFormButton,
      ],
    },
  ],
});
