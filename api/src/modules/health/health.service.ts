class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'disuza-api',
      timestamp: new Date().toISOString(),
    };
  }
}

const healthService = new HealthService();

export { HealthService };
export default healthService;
