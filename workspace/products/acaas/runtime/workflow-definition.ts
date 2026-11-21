export const complianceWorkflow = {
  stages: [
    'initiate',
    'assess',
    'monitor',
    'automate',
    'generate-evidence',
    'complete'
  ],
  transitions: {
    initiate: ['assess'],
    assess: ['monitor'],
    monitor: ['automate'],
    automate: ['generate-evidence'],
    'generate-evidence': ['complete']
  }
};