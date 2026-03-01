import { Component } from '@angular/core';

interface GuideStep {
  title: string;
  text: string;
  image?: string;
  alt?: string;
}

interface GuideItem {
  slug: string;
  title: string;
  tag: string;
  time: string;
  difficulty: string;
  summary: string;
  image?: string;
  imageAlt?: string;
  steps: GuideStep[];
  tips?: string[];
}

@Component({
  selector: 'app-mate-guides',
  templateUrl: './mate-guides.component.html',
  styleUrls: ['./mate-guides.component.css']
})
export class MateGuidesComponent {
  guides: GuideItem[] = [
    {
      slug: 'curar-mate-porongo',
      title: 'Curar un mate de porongo',
      tag: 'Primeros cuidados',
      time: '30 minutos',
      difficulty: 'Fácil',
      summary: 'Sellá los poros del porongo, evitá filtraciones y domá los sabores amargos iniciales.',
      image: 'https://yerbamateargentina.org.ar/imagenes/archivos/noticias/80401_imagen.jpg',
      imageAlt: 'Mate de porongo curado sobre fondo rústico',
      steps: [
        { title: 'Limpieza inicial', text: 'Enjuagá el interior con agua tibia, sin jabón. Secá con un paño limpio.' },
        { title: 'Carga de yerba', text: 'Llená 3/4 con yerba usada o nueva y añadí agua tibia (no hervida) hasta humedecer. Dejá reposar 12-24 h.' },
        { title: 'Descartar y raspar suave', text: 'Retirá la yerba y con una cuchara de madera raspá suavemente los bordes sueltos. No uses metal ni fuerza.' },
        { title: 'Repetir ciclo', text: 'Repetí el paso de carga y reposo una o dos veces más para sellar mejor.' },
        { title: 'Secado', text: 'Secá boca abajo en lugar ventilado. Evitá sol directo y hornallas.' }
      ],
      tips: [
        'Nunca uses detergente dentro del mate de porongo.',
        'Si aparece olor fuerte, dejá reposar con yerba usada y dos cáscaras de naranja por 12 h.',
        'Guardá siempre seco y boca abajo para prevenir hongos.'
      ]
    },
    {
      slug: 'preparar-buen-mate',
      title: 'Preparar un buen mate',
      tag: 'Receta base',
      time: '5 minutos',
      difficulty: 'Fácil',
      summary: 'Equilibrá temperatura, inclinación y cebado para un mate rendidor y parejo.',
      image: 'https://grupovierci.brightspotcdn.com/dims4/default/08faff0/2147483647/strip/true/crop/1200x676+0+77/resize/1000x563!/quality/90/?url=https%3A%2F%2Fk2-prod-grupo-vierci.s3.us-east-1.amazonaws.com%2Fbrightspot%2Fadjuntos%2F161%2Fimagenes%2F009%2F839%2F0009839463.png',
      imageAlt: 'Mate listo para cebar con yerba fresca',
      steps: [
        { title: 'Agua a punto', text: '70-80 °C. Si hierve, dejá bajar; buscá vapor fino sin burbujeo fuerte.' },
        { title: 'Montañita', text: 'Llená 3/4 el mate, tapá con la mano, agitá y formá un hueco al costado.' },
        { title: 'Humectar', text: 'Verté un chorrito de agua tibia en la base del hueco y dejá que la yerba la absorba.' },
        { title: 'Bombilla fija', text: 'Apoyá la bombilla en el hueco húmedo y no la muevas más.' },
        { title: 'Cebado corto', text: 'Cebá con chorros cortos al pie de la bombilla; no inundes toda la superficie.' }
      ],
      tips: [
        'Si se lava rápido, bajá la temperatura del agua o usá menos cantidad por cebada.',
        'Rotá la zona de cebado cuando un sector se agote para prolongar el sabor.',
        'Probá mezclas: 80% yerba tradicional + 20% suave para mates largos.'
      ]
    },
    {
      slug: 'limpiar-bombilla',
      title: 'Cómo limpiar la bombilla',
      tag: 'Mantenimiento',
      time: '10 minutos',
      difficulty: 'Muy fácil',
      summary: 'Evita obstrucciones, sabores rancios y conserva el brillo del acero o alpaca.',
      image: 'https://media.airedesantafe.com.ar/p/3a6334f4d5a6a70a7626ec3449372682/adjuntos/268/imagenes/003/928/0003928637/412x232/smart/limpiar-la-bombilla-del-mate.jpg',
      imageAlt: 'Bombilla de mate siendo limpiada',
      steps: [
        { title: 'Enjuague diario', text: 'Tras cada uso, pasá agua caliente (no hirviendo) por la bombilla y drená.' },
        { title: 'Desarme (si es posible)', text: 'Si la boquilla se desenrosca, abrila para retirar restos de polvo y palitos.' },
        { title: 'Baño profundo', text: 'Cada semana, herví 5 minutos en agua con una cucharadita de bicarbonato; enjuagá bien.' },
        { title: 'Secado completo', text: 'Secá con paño y dejá al aire; evitá guardarla húmeda dentro del mate.' }
      ],
      tips: [
        'No uses lavandina: puede corroer y dejar sabor metálico.',
        'Para sarro persistente, agregá 1 cucharada de vinagre al hervor y enjuagá de inmediato.',
        'Guardá la bombilla aparte para evitar que se marque la calabaza.'
      ]
    },
    {
      slug: 'cuidado-termo',
      title: 'Cuidado del termo',
      tag: 'Termos y tapa',
      time: '15 minutos',
      difficulty: 'Fácil',
      summary: 'Conservá temperatura y alargá la vida útil del pico vertedor y el interior.',
      image: 'https://www.grupobillingham.com/blog/wp-content/uploads/2022/11/Cuidado-del-termo-750x410.jpg',
      imageAlt: 'Termo y equipo de mate listos para usar',
      steps: [
        { title: 'Precalentar', text: 'Antes de salir, llená con agua caliente unos minutos, vaciá y cargá con el agua de cebar.' },
        { title: 'Limpieza suave', text: 'Usá agua tibia y unas gotas de detergente neutro; evitá esponjas abrasivas en acero o vidrio.' },
        { title: 'Desodorizar', text: 'Una vez al mes, bicarbonato + agua tibia 30 min; enjuagá varias veces.' },
        { title: 'Tapas y juntas', text: 'Desarmá el pico, limpiá roscas y juntas; secá bien para evitar hongos.' }
      ],
      tips: [
        'No uses agua hirviendo en termos de plástico fino: deforma y pierde vacío.',
        'No guardes bebidas azucaradas por horas: caramelizan y dejan olor.',
        'Transportá vertical para cuidar el sello y evitar fugas.'
      ]
    }
  ];
}
