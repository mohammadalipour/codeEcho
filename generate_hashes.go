package codeecho
package main

import (
	"fmt"
	"log"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	passwords := map[string]string{
		"admin123": "admin@codeecho.com",
		"user123":  "user@codeecho.com", 
		"dev123":   "dev@codeecho.com",
	}

	for password, email := range passwords {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("-- %s (password: %s)\npassword_hash: '%s'\n\n", email, password, string(hash))
	}
}