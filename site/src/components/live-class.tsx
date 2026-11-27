"use client";

import { useState } from "react";
import { ClassDemo } from "./class-demo";

export function LiveClass() {
  const [resolved, setResolved] = useState(false);
  return (
    <section id="mukodes" className="live" aria-labelledby="live-title">
      <div className="live-intro glass">
        <h2 id="live-title" className="headline rounds" data-resolved={resolved || undefined}>
          Az óra, ahogy a MeetCoder látja.
        </h2>
        <p className="lede">
          A tanár ír, a képernyő változik. A MeetCoder <strong>csak a változott képkockát</strong> küldi a modellnek,
          az pedig <strong>a te mappádba írja a kódot</strong>, jegyzetel, és minden lépéshez ad egy visszavonás
          gombot. Próbáld ki lent.
        </p>
      </div>
      <ClassDemo onResolved={setResolved} />
    </section>
  );
}
