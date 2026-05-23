const prisma = require("../config/database");

const getAllCorridors = async () => {
  return await prisma.corridor.findMany({
    orderBy: { name: "asc" },
  });
};

const getCorridorById = async (id) => {
  return await prisma.corridor.findUnique({
    where: { id },
  });
};

const createCorridor = async (data) => {
  return await prisma.corridor.create({
    data: {
      name: data.name,
      description: data.description,
    },
  });
};

const updateCorridor = async (id, data) => {
  return await prisma.corridor.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
    },
  });
};

const deleteCorridor = async (id) => {
  return await prisma.corridor.delete({
    where: { id },
  });
};

module.exports = {
  getAllCorridors,
  getCorridorById,
  createCorridor,
  updateCorridor,
  deleteCorridor,
};
