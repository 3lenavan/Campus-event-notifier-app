import type { ImageSourcePropType } from "react-native";
import type { Event } from "../types";

export type DemoEvent = Event & {
  category: string;
  imageSource: ImageSourcePropType;
};

const futureDate = (daysFromNow: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
};

export function getDemoEvents(): DemoEvent[] {
  return [
    {
      id: "demo-concert",
      title: "Summer Kickoff Concert",
      description: "Kick off the semester with live music, friends, food, and a golden-hour campus celebration.",
      clubId: "demo-activities",
      dateISO: futureDate(0, 19),
      location: "Campus Quad",
      createdBy: "buzzup-demo",
      createdAt: Date.now(),
      status: "approved",
      attendees: 184,
      category: "Music",
      imageSource: require("../../assets/events/summer-kickoff-concert.jpg"),
    },
    {
      id: "demo-robotics",
      title: "Robotics Demo Night",
      description: "Meet student makers and see friendly robots, prototypes, and hands-on demonstrations.",
      clubId: "demo-robotics-club",
      dateISO: futureDate(1, 18, 30),
      location: "Innovation Lab",
      createdBy: "buzzup-demo",
      createdAt: Date.now(),
      status: "approved",
      attendees: 76,
      category: "Technology",
      imageSource: require("../../assets/events/robotics-demo-night.jpg"),
    },
    {
      id: "demo-movie",
      title: "Outdoor Movie Night",
      description: "Bring a blanket and enjoy a cozy movie under the campus lights with free popcorn.",
      clubId: "demo-film-club",
      dateISO: futureDate(3, 20),
      location: "Library Lawn",
      createdBy: "buzzup-demo",
      createdAt: Date.now(),
      status: "approved",
      attendees: 132,
      category: "Film",
      imageSource: require("../../assets/events/outdoor-movie-night.jpg"),
    },
    {
      id: "demo-volunteer",
      title: "Campus Volunteer Day",
      description: "Help refresh the campus garden and meet students who care about the community.",
      clubId: "demo-service-club",
      dateISO: futureDate(4, 10),
      location: "Student Center Garden",
      createdBy: "buzzup-demo",
      createdAt: Date.now(),
      status: "approved",
      attendees: 58,
      category: "Service",
      imageSource: require("../../assets/events/campus-volunteer-day.jpg"),
    },
  ];
}

export function getDemoEventById(id?: string) {
  return getDemoEvents().find((event) => event.id === id) || null;
}
