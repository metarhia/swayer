class PatientService {
  async getRegisterFormData() {
    return {
      action: 'createPatient',
      title: 'Registration form',
      fields: {
        name: {
          type: 'text',
          defaultValue: '',
          placeholder: 'Name',
        },
        phone: {
          type: 'text',
          defaultValue: '',
          placeholder: 'Phone',
        },
      },
    };
  }

  async getDiseaseFormData() {
    return {
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
    };
  }
}
export default new PatientService();
