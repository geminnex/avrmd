import { beforeAll, describe, expect, it } from "vitest";
import { ownerTag, ownUploadMimeType } from "./storage";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret";
  process.env.S3_PUBLIC_URL = "https://avrmd.cyalin.com/media";
  process.env.S3_BUCKET = "avrmd";
});

describe("upload ownership", () => {
  const user = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";
  const own = () =>
    `https://avrmd.cyalin.com/media/avrmd/posts/${ownerTag(user)}/0f8fad5b-d9cb-469f-a165-70867728950e.jpg`;

  it("never puts the user id in the path", () => {
    expect(ownerTag(user)).not.toContain("1111");
    expect(ownerTag(user)).toBe(ownerTag(user));
    expect(ownerTag(user)).not.toBe(ownerTag(other));
  });

  it("accepts the member's own upload and takes the type from the key", () => {
    expect(ownUploadMimeType(own(), user)).toBe("image/jpeg");
  });

  it.each([
    ["someone else's upload", () => own().replace(ownerTag(user), ownerTag(other))],
    ["an external tracking pixel", () => "https://tracker.example/p.gif"],
    ["a path trick", () => own().replace(".jpg", ".jpg/../../x")],
    ["an unexpected type", () => own().replace(".jpg", ".svg")],
  ])("refuses %s", (_, url) => {
    expect(ownUploadMimeType(url(), user)).toBeNull();
  });
});
