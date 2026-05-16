const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllReports = async (status = null) => {
  const where = status ? { status } : {};
  return prisma.report.findMany({
    where,
    include: {
      author: {
        select: { id: true, name: true, roles: { include: { role: true } } }
      },
      _count: {
        select: { replies: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};

const getReportById = async (id) => {
  return prisma.report.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, roles: { include: { role: true } } }
      },
      replies: {
        include: {
          author: {
            select: { id: true, name: true, roles: { include: { role: true } } }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
};

const createReport = async (authorId, data) => {
  return prisma.report.create({
    data: {
      authorId,
      title: data.title,
      content: data.content,
      mediaPath: data.mediaPath || null,
      status: "open"
    }
  });
};

const updateReportStatus = async (id, status) => {
  return prisma.report.update({
    where: { id },
    data: { status }
  });
};

const deleteReport = async (id) => {
  return prisma.report.delete({
    where: { id }
  });
};

const createReply = async (reportId, authorId, data) => {
  return prisma.reportReply.create({
    data: {
      reportId,
      authorId,
      content: data.content,
      mediaPath: data.mediaPath || null
    }
  });
};

const getReportStats = async () => {
  const stats = await prisma.report.groupBy({
    by: ["status"],
    _count: { id: true }
  });

  const formattedStats = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: 0
  };

  stats.forEach(stat => {
    formattedStats[stat.status] = stat._count.id;
    formattedStats.total += stat._count.id;
  });

  return formattedStats;
};

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReportStatus,
  deleteReport,
  createReply,
  getReportStats
};
