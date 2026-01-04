import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseProductService } from '../../services/firebase-product.service';
import { ImageService } from '../../services/image.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css']
})
export class AddProductComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  product = {
    name: '',
    description: '',
    price: 0,
    image: '',
    category: '',
    stock: 0
  };

  categories = ['Mates', 'Bombillas', 'Yerba', 'Termos', 'Accesorios'];
  errorMessage = '';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitting = false;

  constructor(
    private firebaseProductService: FirebaseProductService,
    private imageService: ImageService,
    private router: Router
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async onSubmit() {
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor, seleccione una imagen para el producto';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const imageUrl = await firstValueFrom(this.imageService.uploadImage(this.selectedFile));
      
      const productData = {
        name: this.product.name,
        description: this.product.description,
        price: this.product.price,
        image: imageUrl,
        category: this.product.category,
        stock: this.product.stock
      };

      await firstValueFrom(this.firebaseProductService.addProduct(productData));
      this.router.navigate(['/productos']);
    } catch (error: any) {
      console.error('Error al agregar producto:', error);
      this.errorMessage = error.message || 'Error al agregar el producto. Por favor, intente nuevamente.';
    } finally {
      this.isSubmitting = false;
    }
  }
}