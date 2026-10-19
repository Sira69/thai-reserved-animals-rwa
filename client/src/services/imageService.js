export function imageToBase64(file) {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        resolve(
          String(reader.result)
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "ไม่สามารถอ่านรูปภาพได้"
          )
        );
      };

      reader.readAsDataURL(file);
    }
  );
}
