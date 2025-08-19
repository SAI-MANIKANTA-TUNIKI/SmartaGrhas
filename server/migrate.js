// Migration script (run in MongoDB shell or Node.js)
const mongoose = require("mongoose");
const Room = require("./Models/roomModel");

async function migrateRooms() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/device_db");
  const rooms = await Room.find({ thingName: { $exists: false } });
  for (const room of rooms) {
    room.thingName = room.esp32_ip ? `ESP32-${room.esp32_ip.replace(/\./g, '-')}` : `ESP32-${room._id}`;
    await room.save();
    console.log(`Migrated room ${room._id} with thingName: ${room.thingName}`);
  }
  console.log("Migration complete");
  mongoose.disconnect();
}

migrateRooms().catch(console.error);