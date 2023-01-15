class FormService {
  async sendFormData(action, data) {
    return `Call ${action} with: ${JSON.stringify(data)}`;
  }
}
export default new FormService();
