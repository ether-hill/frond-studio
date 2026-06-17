import { defineField, defineType } from "sanity";

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle / tagline",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first.",
    }),
    defineField({
      name: "client",
      title: "Client",
      type: "string",
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
    }),
    defineField({
      name: "services",
      title: "Services / disciplines",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 2,
      description: "One-line summary used on cards and meta description.",
    }),
    defineField({
      name: "keyPoints",
      title: "Key points",
      type: "array",
      of: [{ type: "string" }],
      description: "Three short highlight bullets shown on the Projects index.",
      validation: (r) => r.max(4),
    }),
    defineField({
      name: "thumbnailVideo",
      title: "Thumbnail video (mp4 URL)",
      type: "url",
      description: "Looping video shown as the project thumbnail.",
    }),
    defineField({
      name: "thumbnailImage",
      title: "Thumbnail poster image (URL)",
      type: "url",
      description: "Fallback / poster image for the thumbnail video.",
    }),
    defineField({
      name: "liveUrl",
      title: "Live site URL",
      type: "url",
    }),
    defineField({
      name: "overview",
      title: "Overview / case study",
      type: "array",
      of: [{ type: "block" }],
    }),
  ],
  orderings: [
    {
      title: "Display order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "subtitle" },
  },
});
