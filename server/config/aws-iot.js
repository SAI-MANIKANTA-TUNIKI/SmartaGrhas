import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const iot = new AWS.IotData({
  endpoint: process.env.AWS_IOT_ENDPOINT,
});

export const publishMessage = async (topic, message) => {
  const params = {
    topic,
    payload: JSON.stringify(message),
    qos: 0,
  };
  try {
    await iot.publish(params).promise();
    console.log(`Published to ${topic}:`, message);
  } catch (error) {
    console.error(`Error publishing to ${topic}:`, error);
    throw error;
  }
};

export const subscribeToTopic = async (topic) => {
  // Note: AWS IoT Core subscriptions are typically handled client-side or via AWS IoT Device SDK.
  // This function is a placeholder for backend-initiated subscriptions if needed.
  console.log(`Subscribed to ${topic}`);
};

export default iot;