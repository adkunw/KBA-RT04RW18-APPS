const prisma = require("../config/database");

/**
 * Get all settings as a key-value object
 * @returns {Promise<Object>}
 */
const getAllSettings = async () => {
  const settings = await prisma.setting.findMany();
  const settingsObj = {};
  for (const s of settings) {
    settingsObj[s.key] = s.value;
  }
  return settingsObj;
};

/**
 * Get a specific setting by key
 * @param {string} key 
 * @param {string} defaultValue 
 * @returns {Promise<string>}
 */
const getSetting = async (key, defaultValue = "") => {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting ? setting.value : defaultValue;
};

/**
 * Update a setting
 * @param {string} key 
 * @param {string} value 
 */
const updateSetting = async (key, value) => {
  return await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

/**
 * Update multiple settings
 * @param {Object} settingsObj 
 */
const updateManySettings = async (settingsObj) => {
  const updates = Object.entries(settingsObj).map(([key, value]) => {
    return prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  });
  await prisma.$transaction(updates);
};

module.exports = {
  getAllSettings,
  getSetting,
  updateSetting,
  updateManySettings,
};
