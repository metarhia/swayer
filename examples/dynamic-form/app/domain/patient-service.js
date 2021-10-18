class PatientService {
  async getRegisterFormData() {
    return {
      action: 'createPatient',
      title: 'Registration form',
      fields: {
        name: {
          type: 'text',
          placeholder: 'Name',
        },
        phone: {
          type: 'text',
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
          placeholder: 'Name',
        },
        symptom: {
          type: 'select',
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
