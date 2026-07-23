import { ref } from 'vue';

export const isMenuOpen = ref(false);
export const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};