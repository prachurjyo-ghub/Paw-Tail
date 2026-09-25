const mongoose = require("mongoose");

const Inquiry = require("../../models/Inquiry");

const createInquiry = async (req, res, next) => {
  try {
    const { name, phone, email, pet, topic, message } = req.body;

    if (!name?.trim() || !phone?.trim() || !email?.trim() || !pet?.trim() || !topic || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, email, pet, topic, and message are required",
      });
    }

    if (!Inquiry.TOPICS.includes(topic)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry topic",
      });
    }

    const inquiry = await Inquiry.create({
      user: req.user?._id || null,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      pet: pet.trim(),
      topic,
      message: message.trim(),
      status: "need_contact",
    });

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      inquiry,
      requiresAuthPrompt: !req.user,
    });
  } catch (error) {
    next(error);
  }
};

const getInquiriesAdmin = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status === "need_contact" || req.query.status === "contacted") {
      filter.status = req.query.status;
    }
    if (req.query.topic && Inquiry.TOPICS.includes(req.query.topic)) {
      filter.topic = req.query.topic;
    }
    if (req.query.q) {
      const q = String(req.query.q).trim();
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { message: { $regex: q, $options: "i" } },
        ];
      }
    }

    const inquiries = await Inquiry.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Inquiries fetched successfully",
      inquiries,
      topics: Inquiry.TOPICS,
    });
  } catch (error) {
    next(error);
  }
};

const getMyInquiries = async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find({
      $or: [
        { user: req.user._id },
        { email: req.user.email?.toLowerCase() },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Inquiries fetched successfully",
      inquiries,
    });
  } catch (error) {
    next(error);
  }
};

const updateInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid inquiry id is required",
      });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    if (req.body.status === "need_contact" || req.body.status === "contacted") {
      inquiry.status = req.body.status;
    }

    if (typeof req.body.adminReply === "string") {
      inquiry.adminReply = req.body.adminReply.trim();
      inquiry.repliedAt = inquiry.adminReply ? new Date() : null;
      if (inquiry.adminReply && inquiry.status === "need_contact") {
        inquiry.status = "contacted";
      }
    }

    await inquiry.save();

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully",
      inquiry,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInquiry,
  getInquiriesAdmin,
  getMyInquiries,
  updateInquiry,
};
