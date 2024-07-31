package main

import (
	// "net/http"

	"net/http"

	"github.com/labstack/echo/v4"

	.
)

func main() {
	e := echo.New()
	e.Static("/", "build")
	e.GET("/hello", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	e.Logger.Fatal(e.Start(":1323"))
}
