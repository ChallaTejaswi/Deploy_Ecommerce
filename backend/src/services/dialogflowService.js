const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

const projectId = process.env.DIALOGFLOW_PROJECT_ID;

class DialogflowService {
  async detectIntent(userId, userInput, languageCode = 'en') {
    try {
      const sessionId = uuid.v4();

      // Setup credentials from environment
      const sessionClient = new dialogflow.SessionsClient({
        credentials: {
          client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
          private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      });

      const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

      let safeInput = userInput;
      if (typeof safeInput === 'string' && safeInput.length > 200)
        safeInput = safeInput.slice(0, 197) + '...';

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: safeInput,
            languageCode: languageCode,
          },
        },
      };

      const responses = await sessionClient.detectIntent(request);
      const result = responses[0].queryResult;

      return {
        queryResult: result,
        flowDecision: {
          flow: result.intent ? result.intent.displayName : 'unknown',
          reason: 'Dialogflow intent detection',
          confidence: result.intentDetectionConfidence || 0.8
        },
        intent: result.intent ? result.intent.displayName : 'unknown',
        confidence: result.intentDetectionConfidence || 0.8,
        parameters: result.parameters || {},
        fulfillmentText: result.fulfillmentText || '',
        languageCode: languageCode
      };

    } catch (error) {
      console.error('Dialogflow intent detection error:', error);
      return {
        queryResult: {
          queryText: userInput,
          intent: { displayName: 'unknown' },
          parameters: {},
          fulfillmentText: '',
          languageCode: languageCode
        },
        flowDecision: {
          flow: 'IVR',
          reason: 'Dialogflow error',
          confidence: 0.5
        },
        intent: 'unknown',
        confidence: 0.5,
        parameters: {},
        fulfillmentText: '',
        languageCode: languageCode
      };
    }
  }
}

module.exports = new DialogflowService();
