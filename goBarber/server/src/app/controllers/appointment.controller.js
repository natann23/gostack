import User from "../models/User";
import File from "../models/File";
import Appointment from "../models/Appointment";
import * as Yup from "yup";
import { startOfHour, parseISO, isBefore } from "date-fns";
class AppointmentController {
  async index(req, res) {
    const appointment = await Appointment.findAll({
      where: { user_id: req.userId, cancelled_at: null },
      order: ["date"],
      attributes: ["id", "date"],
      include: [
        {
          model: User,
          as: "provider",
          attributes: ["id", "name"],
          include: [
            {
              model: File,
              attributes: ["id", "path", "url"]
            }
          ]
        }
      ]
    });

    return res.json(appointment);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required()
    });
    // end of schema
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }
    const { provider_id, date } = req.body;
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true }
    });
    if (!isProvider) res.status(401).json({ error: "user is not a provider" });

    // CHECKING IF DATE HAS NO PASSED

    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: "Past dates are not permitted" });
    }

    // CHECK AVAILABILITY
    const appointmentBooked = await Appointment.findOne({
      where: {
        provider_id,
        cancelled_at: null,
        date: hourStart
      }
    });

    if (appointmentBooked) {
      return res
        .status(400)
        .json({ error: "Appointment date is not available" });
    }

    //IF ALL TEST PASSS

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart
    });
    return res.json(appointment);
  }
}

export default new AppointmentController();
